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

    exports.feeds = {};
    exports.follow = function ( view, changes, since, callback) {
    	console.log("i think i'm being followed: ", view, changes, since )

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
                // unfollow
                exports.unfollow(url)
                changes.url = url + "?since=" + changes.since.toString()
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
