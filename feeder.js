
define('feeder', ['exports', 'couchr'], function (exports, couchr) {

    /**
     * Query a url and watch a couchdb feed for changes since a certain 
     * update sequence. When changes occur (i.e. when the feed answers 
     * the http request with a <last_seq> greater than @since), the 
     * backback is executet
     *
     * @param {Function} callback(err,response)
     * @api private
     */


    // monkey-patch couchr, we will be waiting for
    // caolan to hopefully let the requests return 
    // jQuery's jqXHR object in future releases of 
    // couchr
    // this function is actually the same, but hidden
    // inside of couchr.
    couchr.onComplete = function(options, callback) {
        return function (req) {
            var resp;
            if (ctype = req.getResponseHeader('Content-Type')) {
                ctype = ctype.split(';')[0];
            }
            if (ctype === 'application/json' || ctype === 'text/json') {
                try {
                    resp = $.parseJSON(req.responseText)
                }
                catch (e) {
                    return callback(e, null, req);
                }
            }
            else {
                var ct = req.getResponseHeader("content-type") || "";
                var xml = ct.indexOf("xml") >= 0;
                resp = xml ? req.responseXML : req.responseText;
            }
            if (req.status == 200 || req.status == 201 || req.status == 202) {
                callback(null, resp, req);
            }
            else if (resp && (resp.error || resp.reason)) {
                var err = new Error(resp.reason || resp.error);
                err.error = resp.error;
                err.reason = resp.reason;
                err.code = resp.code;
                err.status = req.status;
                callback(err, null, req);
            }
            else {
                // TODO: map status code to meaningful error message
                var msg = req.statusText;
                if (!msg || msg === 'error') {
                    msg = 'Returned status code: ' + req.status;
                }
                var err2 = new Error(msg);
                err2.status = req.status;
                callback(err2, null, req);
            }
        };
    }
	// the actual monkeypatch for couchr to return
	// the result of the $.ajax() call
    couchr.ajax = function (options, callback) {
        options.complete = couchr.onComplete(options, callback);
        options.dataType = 'json';
        return $.ajax(options);
    };


    exports.feeds = {};
    exports.follow = function ( view, changes, since, callback) {
        if(!view.url) // <view> is itself the url
            view = { url: view };

        if (!changes.url) // <changes> is itself the url
            changes = { url: changes };

        changes.url = changes.url;
        changes.since = since;
        changes.type = changes.type || 'GET';
        changes.async = changes.async || true;
        changes.cache = changes.cache || false;
        changes.timeout = changes.timeout || 60000;
        
        view.type = view.type || 'GET';
        view.async = view.async || true;
        view.cache = view.cache || false;
        view.timeout = view.timeout || 3000;
        
        var onChange = function(err, data) {
            if (err)
                return callback(err);

            if (data.last_seq !== changes.since) {
                
                // some changes occured since last response
                // issue the appropriate request
                couchr.ajax( view, callback )
               
                // update the options object's url to 
                // reflect the database's update seq
                var url = changes.url
                // unfollow the current view
                exports.unfollow(url)
                changes.url = url + "?since=" + changes.since.toString()
                // couchr needs to return the ajax
                exports.feeds[url] = couchr.ajax( changes, onChange )
                
                changes.since = data.last_seq
                changes.url = url
                
                return url
            }
        }
        // return url as a reference to the request
        console.log("query the view")
        return onChange( null, {last_seq: since-1})
    };
	exports.unfollow = function (url, callback) {
		try {
			if (url === '*') {
				for( feed in exports.feeds ) {
					exports.unfollow( feed )
				}
			}
			else {
				if(!exports.feeds.hasOwnProperty(url))
					throw new Error("not following '" + url + "'");

				exports.feeds[url].abort();
				delete exports.feeds[url];
			}
			if(callback)
				callback();
		} 
		catch (e) {
			if(callback)
				callback(e);
		}
	}

});
