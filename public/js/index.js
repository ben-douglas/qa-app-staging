////////////////////////////////////////////////////////////////
// global data

var theContext = {};
var ResultTable;

////////////////////////////////////////////////////////////////
// startup
//
$(document).ready(function() {

  // retrieve the query params
  var theQuery = $.getQuery();

  // connect the button
  $("#element-list-docs").button().click(onListDocuments);
  $("#element-create-ps").button().click(onCreatePS);
  $("#element-delete-ps").button().click(onDeletePS);

  // Hold onto the current session information
  theContext.documentId = theQuery.documentId;
  theContext.workspaceId = theQuery.workspaceId;
  theContext.elementId = theQuery.elementId;
  theContext.verison = 0;
  theContext.microversion = 0;

  refreshContextElements(0);

  // Hide the UI elements we don't need right now
  // uiDisplay('off', 'on');
});

function onListDocuments() {
  $("#document-list").empty();
  $.ajax('/api/documents', {
    dataType: 'json',
    type: 'GET',
    // cache: false,
    success: function(data) {
      $("#document-list").append('Got ' + data.items.length + ' documents');
    },
    error: function(data) {
      $("#document-list").append('Got error <pre>' + JSON.stringify(data, null, 2) + '</pre>');
    }
  });
}

function onCreatePS() {
  $("#create-ps").empty();
  $.ajax('/api/elements'+
    "?documentId=" + theContext.documentId +
    "&workspaceId=" + theContext.workspaceId, {
    dataType: 'json',
    type: 'GET',
    cache: false,
    success: function(data) {
      for (var i = 0; i < data.length; i++) {
        if (data[i].name == 'QA PartStudio') {
          $("#create-ps").append('Already have QA PartStudio');
          return;
        }
      }
    },
    error: function(data) {
      $("#create-ps").append('Got error checking elements <pre>' + JSON.stringify(data, null, 2) + '</pre>');
      return;
    }
  });

  // Create the partstudio
  $("#create-ps").append('Not implemented Yet (Got ' + data.length + ' elements)');

  $.ajax('/api/newps' +
    "?documentId=" + theContext.documentId +
    "&workspaceId=" + theContext.workspaceId +
    "&name=QA+PartStudio", {
    dataType: 'json',
    type: 'GET',
    cache: false,
    success: function(data) {
      $("#create-ps").append('QA PartStudio Created!');
    },
    error: function(data) {
      $("#create-ps").append('Got error creating partstudio: <pre>' + JSON.stringify(data, null, 2) + '</pre>');
      return;
    }
  });

}

function onDeletePS() {
  $("#delete-ps").empty();
  $("#delete-ps").append('NOT DONE YET');
}

// Send message to Onshape
function sendMessage(msgName) {
  var msg = {};
  msg['documentId'] = theContext.documentId;
  msg['workspaceId'] = theContext.workspaceId;
  msg['elementId'] =  theContext.elementId;
  msg['messageName'] = msgName;

  parent.postMessage(msg, '*');
}

//
// Check to see if a model has changed
function checkForChange(resolve, reject, elementId) {
  var params = "?documentId=" + theContext.documentId + "&workspaceId=" + theContext.workspaceId + "&elementId=" + elementId;

  $.ajax('/api/modelchange'+ params, {
    dataType: 'json',
    type: 'GET',
    success: function(data) {
      var objects = data;
      if (objects.change == true && Parts.length > 0) {
        // Show the message to say the QA may be invalid
        var e = document.getElementById("element-model-change-message");
        e.style.display = "initial";
      }
      resolve(1);
    },
    error: function(data) {
      reject(0);
    }
  });
}

//
// Tab is now shown
function onShow() {
  var listPromises = [];
  var selectedIndex = 0;

  // Check to see if any of the assemblies have changed, if so, let the user know
  $('#elt-select option').each(function(index,element){
    listPromises.push(new Promise(function(resolve, reject) { checkForChange(resolve, reject, element.value); }));

    if (element.value == theContext.elementId)
      selectedIndex = index;
  });

  return Promise.all(listPromises).then(function() {
    // Update the assembly list ... it may have changed.
    refreshContextElements(selectedIndex);
  });
}

function onHide() {
  // our tab is hidden
  // take appropriate action
}

function handlePostMessage(e) {
  if (e.data.messageName === 'show') {
    onShow();
  } else if (e.data.messageName === 'hide') {
    onHide();
  }
};

// keep Onshape alive if we have an active user
var keepaliveCounter = 5 * 60 * 1000;   // 5 minutes
var timeLastKeepaliveSent;
// User activity detected. Send keepalive if we haven't recently
function keepAlive() {
  var now = new Date().getTime();
  if (now > timeLastKeepaliveSent + keepaliveCounter) {
    sendKeepalive();
  }
}

// Send a keepalive message to Onshape
function sendKeepalive() {
  sendMessage('keepAlive');
  timeLastKeepaliveSent = new Date().getTime();
}

// First message to Onshape tells the Onshape client we can accept messages
function onDomLoaded() {
  // listen for messages from Onshape client
  window.addEventListener('message', handlePostMessage, false);
  timeLastKeepaliveSent = 0;
  document.onmousemove = keepAlive;
  document.onkeypress = keepAlive;
  sendKeepalive();
  return false;
}

// When we are loaded, start the Onshape client messageing
document.addEventListener("DOMContentLoaded", onDomLoaded);

//
// Simple alert infrasturcture
function displayAlert(message) {
  $("#alert_template span").remove();
  $("#alert_template button").after('<span>' + message + '<br></span>');
  $('#alert_template').fadeIn('slow');
  $('#alert_template .close').click(function(ee) {
    $("#alert_template").hide();
    $("#alert_template span").hide();
  });
}

//
// Update the list of elements in the context object
//
function refreshContextElements(selectedIndexIn) {

  // First, show our session info
  $('#session-info').empty();
  $.ajax('/api/session', {
    dataType: 'json',
    type: 'GET',
    cache: false,
    success: function(data) {
      if (typeof data.email === 'undefined') {
        $('#session-info').append('<b>No PII Data</b><br>');
      } else {
        $('#session-info').append('<b>Got PII Data</b><br>');
      }
      $('#session-info').append('<pre>' + JSON.stringify(data, null, 2) + '</pre>');
    },
    error: function(data) {
      displayAlert('Error getting /api/session');
      $('#session-info').append('Error getting session info <pre>' + data + '</pre>');
    }
  });
}


