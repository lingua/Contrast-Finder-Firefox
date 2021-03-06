var cm = require("sdk/context-menu");
var _ = require("sdk/l10n").get;
var array = require('sdk/util/array');
var data = require("sdk/self").data;
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var workers = [];
var tabWorkers = [];
var selectionInProgressTabs=[];

function detachWorker(worker, workerArray) {
    var index = workerArray.indexOf(worker);
    if(index != -1) {
	workerArray.splice(index, 1);
    }
}

// set if the tabWorker is destroyed
var isDestroy = false;

var sidebar = require("sdk/ui/sidebar").Sidebar({
    id: 'my-sidebar',
    title: 'Tanaguru Contrast Finder',
    url: data.url("contrast-finder-module.html"),
    onAttach: function (worker) {
	var tabWorker = null;
	workers.push(worker);
	tabs.on("open", function() {
	    worker.port.emit("stop-selector");
	});
	tabs.on("ready", function() {
	    worker.port.emit("stop-selector");
	});
	tabs.on("activate", function() {
	    var isCurrentTabHasSelectionInProgress = false;
	    for (var i=0;i<selectionInProgressTabs.length;i++){
		if (selectionInProgressTabs[i].tabId === tabs.activeTab.id) {
		    isCurrentTabHasSelectionInProgress = true;
		    break;
		}
	    }
	    if (isCurrentTabHasSelectionInProgress) {
		worker.port.emit("start-selector-button");
	    } else
		worker.port.emit("stop-selector")
	});
	worker.port.on('checked', function() {
	    isDestroy = false;
	    tabWorker = tabs.activeTab.attach({
		contentScriptFile: data.url("js/contrast-finder-module.js")
	    });
	    tabWorker.port.on("over-refresh", function(tabResult) {
		worker.port.emit("live-components", tabResult);
	    });
	    tabWorker.port.on("click-refresh", function(tabResult) {
		worker.port.emit("click-components", tabResult);
	    });
	    var currentSelectionInProgressTab={};
	    currentSelectionInProgressTab.tabId=tabs.activeTab.id;
	    currentSelectionInProgressTab.tabWorker=tabWorker;
	    selectionInProgressTabs.push(currentSelectionInProgressTab);
	    tabWorker.port.emit("selector-checked");
	});
	worker.port.on("unchecked", function () {
	    for (var i=0;i<selectionInProgressTabs.length;i++){
		if (selectionInProgressTabs[i].tabId === tabs.activeTab.id) {
		    var currentTabWorker=selectionInProgressTabs[i].tabWorker;
		    selectionInProgressTabs.splice(i,1);
		    currentTabWorker.port.emit("selector-unchecked");  
		    currentTabWorker.destroy();
		    isDestroy = true;
		    break;
		}
	    }                                     
	    worker.port.emit("stop-selector");
	});
	worker.on('detach', function () {
	    if (isDestroy == false) {
		if (tabWorker !== null) {
		    tabWorker.port.emit("selector-unchecked");
		    tabWorker.destroy();
		    isDestroy = true;
		}
	    }
	    detachWorker(this, workers);
	});
    }
});					    
 
// Create a widget, and attach the sidebar to it, so the sidebar is
// shown when the user clicks the widget.
var my_widget = require("sdk/widget").Widget({
    label: "Contrast-Finder",
    id: "contrast-finder-module",
    contentURL: data.url("images/favicon.ico"),
    onClick: function() {
    	sidebar.show();
    }
});

cm.Menu({
    label: "Tanaguru Contrast-Finder",
    context: cm.URLContext("*"),
    contentScript: '',
    items: [
	cm.Item({label: "Improve foreground", contentScriptFile: data.url("js/contrast-finder.js"), data:"false"}),
	cm.Item({label: "Improve background", contentScriptFile: data.url("js/contrast-finder.js"), data:"true"}),
	cm.Separator(),
	cm.Item({label: "Open sidebar", 
		 contentScript: 'self.on("click", function () {' +
                 '  self.postMessage(null);' +
                 '});',
		 onMessage: function (msg) {
		     sidebar.show();
		 }
		}),
	cm.Separator(),
	cm.Item({label: "Tanaguru Contrast-Finder website", 
		 contentScript: 'self.on("click", function () {' +
                 '  self.postMessage(null);' +
                 '});',
		 onMessage: function (msg) {
		     tabs.activeTab.attach({
			 contentScript:
			 'window.location.href="http://contrast-finder.tanaguru.com"'
		     })
		 }
		}),
    ]});