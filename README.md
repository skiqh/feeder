feeder
======

watch couchdb for changes of a specific view and act on it


Usage
-----

```javascript

// load feeder and request info from the database
// set allow_jsonp to true or fetch the info in 
// an extra request
require(["feeder", "/mydb/_info?callback=define"], function(feeder, db_info) { 
	
	var view = '/mydb/_design/myapp/_view/myview'
	var feed = '/mydb/_changes?filter=_view&view=myapp/myview'
	var since = parseInt(db_info.view_index.update_seq)

	feeder.follow( view, feed, since, function(err, data) {
		if(err)
			throw err

		for (var i = 0; i < data.rows.length; i++) {
			console.log("New message from " + data.rows[i].value.sender)
		}
	})
```