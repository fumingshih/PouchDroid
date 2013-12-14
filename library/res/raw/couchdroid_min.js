var CouchDroid;!function(){"use strict";CouchDroid={DEBUG_MODE:!0,DEBUG_CLASSES:["NativeXMLHttpRequest","PouchDBHelper"],fakeLocalStorage:{},pouchDBs:{}}}(),function(){"use strict";function a(a){CouchDroid.Util.debug("PouchDBHelper",a)}function b(a,b){var c={};a.forEach(function(a){c[a._id]=a}),b.forEach(function(a){a.value&&a.value.rev&&(c[a.id]._rev=a.value.rev)})}function c(a){for(var b=[],c=0,d=a.docs.length;d>c;c++){for(var e=a.docs[c],f=a.uuids[c],g={},h=0,i=a.columns.length;i>h;h++){var j=a.columns[h],k=e[h];g[j]=k}var l={_id:f,table:a.table,user:a.user,sqliteDB:a.sqliteDB,appPackage:a.appPackage,content:g};b.push(l)}return b}function d(b,c){var d=this;d.couchdbUrl=c,d.queue=[],d.batchInProgress=!1,a("attempting to create new PouchDBHelper with dbId "+b+" and couchdbUrl "+c);try{d.db=new PouchDB(b)}catch(e){throw a("ERROR from new PouchDB(): "+JSON.stringify(e)),e}CouchDroid.DEBUG_MODE&&a("created new PouchDBHelper with dbId "+b)}d.prototype.syncAll=function(b){function c(a,c){window.console.log("complete, with err: "+JSON.stringify(a)),window.console.log("complete, with response: "+JSON.stringify(c)),b&&"function"==typeof b&&b()}function d(a){window.console.log("onChange, with change: "+JSON.stringify(a))}var e=this;a("syncAll()");var f=e.db.replicate.to(e.couchdbUrl,{complete:c,onChange:d,continuous:!1});a("called replicate, got response: "+JSON.stringify(f))},d.prototype.putAll=function(b,d){var e=this;a("putAll()");var f=c(b);e.queue.push({docs:f,onProgress:d}),e.processNextBatch()},d.prototype.processNextBatch=function(){var b=this;if(a("processNextBatch()"),b.queue.length&&!b.batchInProgress){b.batchInProgress=!0;var c=b.queue[0];b.queue.shift(),b.processBatch(c.docs,function(){b.batchInProgress=!1,c.onProgress&&"function"==typeof c.onProgress&&c.onProgress(c.docs.length),b.processNextBatch()})}},d.prototype.processBatch=function(c,d){function e(e,g){function h(b,e){a("onBulkPut(): put "+c.length+" documents into PouchDB."),a("onBulkPut(): got err from pouch: "+JSON.stringify(b)),a("onBulkPut(): got response from pouch: "+JSON.stringify(e)),d()}return a("onBulkGet(): got err from pouch: "+e),a("onBulkGet(): got response from pouch: "+g),g&&g.rows?(b(c,g.rows),a("onBulkGet(): attempting to put "+c.length+" documents into PouchDB..."),f.db.bulkDocs({docs:c},h),void 0):(d(),void 0)}var f=this;a("processBatch()");var g=c.map(function(a){return a._id});f.db.allDocs({include_docs:!1,keys:g},e)},CouchDroid.PouchDBHelper=d}(),function(){"use strict";function a(a){CouchDroid.Util.debug("SQLiteNativeDB",a)}function b(b){b=b||function(){};var c=e++,d=function(){a("executing callback with id: "+c),b.apply(null,arguments)};return f.callbacks[c]=d,c}var c=0,d=0,e=0,f={callbacks:{},nativeDBs:{}};f.clearCallbacks=function(a){a.forEach(function(a){delete f.callbacks[a]})},f.onNativeCallback=function(b,c){a("onNativeCallback("+b+", "+c+")");var d=f.callbacks[b];d?d.apply(null,c?[c]:null):window.console.log("callback not found for id "+b+"! "+d)};var g=function(a,b){var c=this;c.sql=a,c.selectArgs=b,c.queryId=d++},h=function(b,d,e,f){var g=this;g.callback=b,g.success=e,g.error=d,g.nativeDB=f,g.queriesIn=[],g.queriesStarted=[],g.queriesDone=[],g.sentEndAsFailure=!1,g.transactionId=c++,a("created new transaction with id "+g.transactionId)};h.prototype.debugQueryStatus=function(){var b=this;CouchDroid.DEBUG_MODE&&a("transactionId "+b.transactionId+": (queriesIn: "+b.queriesIn.length+", queriesStarted: "+b.queriesStarted.length+", queriesDone: "+b.queriesDone.length+")")},h.prototype.wrapQuerySuccess=function(b,c){var d=this;return function(e,f){a("wrapQuerySuccess(), transactionId "+d.transactionId),b&&"function"==typeof b&&b(e,f),d.queriesDone.push(c),d.runNextQueryOrEnd()}},h.prototype.wrapQueryError=function(b,c){var d=this;return function(e){if(a("wrapQueryError(), transactionId "+d.transactionId),b&&"function"==typeof b){a("running queryError"),d.debugQueryStatus();var f=b(d,e);a("ran queryError"),d.debugQueryStatus(),f?(a("failed to correct error, entire transaction is in error"),d.markTransactionInError=!0):a("successfully corrected error, may proceed")}else a("no fallback to correct error, entire transaction is in error"),d.markTransactionInError=!0;d.queriesDone.push(c),d.runNextQueryOrEnd()}},h.prototype.runNextQueryOrEnd=function(){var b=this;if(a("runNextQueryOrEnd(), transactionId "+b.transactionId),b.markTransactionInError)a("ending this transaction unsuccessfully for id "+b.transactionId),b.sentEndAsFailure||(b.endAsFailure(),b.sentEndAsFailure=!0);else if(b.queriesIn.length){a("transactionId "+b.transactionId+": there are "+b.queriesIn.length+"; popping one off the top...");var c=b.queriesIn.shift();b.queriesStarted.push(c),b.debugQueryStatus(),b.nativeDB.executeSql(c,b)}else{a("transactionId "+b.transactionId+": no more queries; end the transaction, maybe?"),b.debugQueryStatus();var d=0===b.queriesIn.length&&b.queriesStarted.length>0&&b.queriesStarted.length===b.queriesDone.length;d&&(a("ending this transaction successfully with id "+b.transactionId),b.endAsSuccessful())}},h.prototype.endAsFailure=function(){var c=this,d=b(function(){a("transactionId "+c.transactionId+": cleaning up after failure."),c.error(),c.nativeDB.processNextTransaction()});SQLiteJavascriptInterface.endTransaction(c.transactionId,c.nativeDB.name,d,d,!1)},h.prototype.endAsSuccessful=function(){var c=this,d=b(function(){a("executing transaction success for transactionId "+c.transactionId),c.success&&"function"==typeof c.success&&c.success(),c.nativeDB.processNextTransaction()}),e=b(function(){a("executing transaction error for transactionId "+c.transactionId),c.error&&"function"==typeof c.error&&c.error(),c.nativeDB.processNextTransaction()});SQLiteJavascriptInterface.endTransaction(c.transactionId,c.nativeDB.name,d,e,!0)},h.prototype.executeSql=function(b,c,d,e){var f=this,h=new g(b,c);h.querySuccess=f.wrapQuerySuccess(d,h),h.queryError=f.wrapQueryError(e,h),f.queriesIn.push(h),a("transaction "+f.transactionId+" got a new query"),f.debugQueryStatus(),f.runNextQueryOrEnd()};var i=function(a){var b=this;b.name=a,b.transactions=[]};i.prototype.init=function(c){var d=this;a("init()");var e=b(function(){c&&"function"==typeof c&&c()});SQLiteJavascriptInterface.open(d.name,e)},i.prototype.transaction=function(b,c,d){var e=this;a("transaction()"),e.transactions.push(new h(b,c,d,e)),e.processNextTransaction()},i.prototype.processNextTransaction=function(){var c=this;if(a("processTransaction()"),c.transactions.length){var d=c.transactions.shift();a("processing transaction with id "+d.transactionId),a("remaining transactions are: "+JSON.stringify(c.transactions.map(function(a){return a.transactionId})));var e=b(d.error),f=b(function(){d.callback(d)});SQLiteJavascriptInterface.startTransaction(d.transactionId,c.name,f,e)}},i.prototype.executeSql=function(c,d){var e=this;a("executeSql()");var f=b(function(b){a("query success!");var e=b&&b.rows?b.rows:[],f={rows:{item:function(a){return e[a]},length:e.length},rowsAffected:b&&b.rowsAffected?b.rowsAffected:0,insertId:b&&b.insertId?b.insertId:0};a("calling querySuccess function..."),d.debugQueryStatus(),c.querySuccess(d,f),a("querySuccess called."),d.debugQueryStatus()}),g=b(c.queryError),h=c.selectArgs?JSON.stringify(c.selectArgs):null;SQLiteJavascriptInterface.executeSql(c.queryId,d.transactionId,e.name,c.sql,h,f,g)},f.openNativeDatabase=function(a,b,c,d,e){var g=f.nativeDBs[a];return g?setTimeout(function(){e&&"function"==typeof e&&e()},0):(g=new i(a),g.init(e),f.nativeDBs[a]=g),g},CouchDroid.SQLiteNativeDB=f}(),function(){"use strict";CouchDroid.Util={debug:function(a,b){if(CouchDroid.DEBUG_MODE&&b){var c=!CouchDroid.DEBUG_CLASSES||-1!==CouchDroid.DEBUG_CLASSES.indexOf(a);if(!c)return;window.console.log(a+": "+b)}}}}(),function(){"use strict";function a(a){CouchDroid.Util.debug("NativeXMLHttpRequest",a)}function b(){var a=this;a.id=c++,a.withCredentials=!1,a.responseType=null,a.onreadystatechange=null,a.readyState=d.UNSENT,a.status=0,a.timeout=0,a.response=null,a.responseText=null,a.requestHeaders={}}var c=0,d={UNSENT:0,OPENED:1,HEADERS_RECEIVED:2,LOADING:3,DONE:4};b.prototype.onNativeCallback=function(b,c,e){var f=this;if(a("onNativeCallback("+c+", "+e+")"),b)window.console.log(JSON.stringify(b));else{f.status=c,f.readyState=d.DONE,f.responseText=e,a("calling onreadystatechange...");try{f.onreadystatechange()}catch(g){window.console.log("onreadystatechange threw error: "+JSON.stringify(g))}a("called onreadystatechange.")}delete CouchDroid.NativeXMLHttpRequests[f.id]},b.prototype.open=function(b,c){var e=this;a("open()"),e.state=d.OPENED,e.method=b,e.url=c},b.prototype.abort=function(){var b=this;a("abort()"),b.state=d.DONE;var c=JSON.stringify(b);try{XhrJavascriptInterface.abort(c)}catch(e){window.console.log("failed to call XhrJavascriptInterface.abort() with selfStringified "+c)}},b.prototype.setRequestHeader=function(b,c){var d=this;a("setRequestHeader()"),d.requestHeaders[b]=c},b.prototype.getRequestHeader=function(b){var c=this;return a("getRequestHeader()"),c.requestHeaders[b]},b.prototype.send=function(b){var c=this;b=b||"","string"!=typeof b&&(window.console.log("body isn't a string!  we don't know what to do!: "+JSON.stringify(b)),b=JSON.stringify(b)),CouchDroid.NativeXMLHttpRequests[c.id]=c;var e=JSON.stringify(c);a("send("+e+","+b+")"),c.state=d.LOADING;try{XhrJavascriptInterface.send(e,b)}catch(f){window.console.log("failed to call XhrJavascriptInterface with selfStringified"+e+" and body "+b)}},CouchDroid.NativeXMLHttpRequest=b,CouchDroid.NativeXMLHttpRequests={}}(),function(){"use strict";Object.keys||(Object.keys=function(a){if("object"!=typeof a&&"function"!=typeof a||null===a)throw new TypeError("Object.keys called on a non-object");var b=[];for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&b.push(c);return b}),Array.isArray||(Array.isArray=function(a){return"[object Array]"===Object.prototype.toString.call(a)}),"forEach"in Array.prototype||(Array.prototype.forEach=function(a,b){for(var c=0,d=this.length;d>c;c++)c in this&&a.call(b,this[c],c,this)}),"map"in Array.prototype||(Array.prototype.map=function(a,b){for(var c=new Array(this.length),d=0,e=this.length;e>d;d++)d in this&&(c[d]=a.call(b,this[d],d,this));return c})}();