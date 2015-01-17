/*
 * navelgazer
 * https://github.com/shama/navelgazer
 *
 * Copyright (c) 2015 Kyle Robinson Young
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('graceful-fs');
var nextback = require('nextback');
var polled = Object.create(null);
var lastTick = Date.now();
var running = false;

var statpoll = module.exports = function(filepath, cb) {
  if (!polled[filepath]) {
    polled[filepath] = { stat: fs.lstatSync(filepath), cb: cb, last: null };
  }
  return {
    close: function() {
      statpoll.close(filepath);
    }
  }
};

// Iterate over polled files
statpoll.tick = function() {
  var files = Object.keys(polled);
  if (files.length < 1 || running === true) return;
  running = true;
  forEachSeries(files, function(file, next) {
    // If file deleted
    if (!fs.existsSync(file)) {
      polled[file].cb('delete', file);
      delete polled[file];
      return next();
    }

    var stat = fs.lstatSync(file);

    // If file has changed
    var diff = stat.mtime - polled[file].stat.mtime;
    if (diff > 0) {
      polled[file].cb('change', file);
    }

    // Set new last accessed time
    polled[file].stat = stat;
    next();
  }, nextback(function() {
    lastTick = Date.now();
    running = false;
  }));
};

// Close up a single watcher
statpoll.close = nextback(function(file) {
  delete polled[file];
  running = false;
});

// Close up all watchers
statpoll.closeAll = nextback(function() {
  polled = Object.create(null);
  running = false;
});

// Return all statpolled watched paths
statpoll.getWatchedPaths = function() {
  return Object.keys(polled);
};


/**
 * Copyright (c) 2010 Caolan McMahon
 * Available under MIT license <https://raw.github.com/caolan/async/master/LICENSE>
 */
function forEachSeries(arr, iterator, callback) {
  callback = callback || function () {};
  if (!arr.length) {
    return callback();
  }
  var completed = 0;
  var iterate = function () {
    iterator(arr[completed], function (err) {
      if (err) {
        callback(err);
        callback = function () {};
      }
      else {
        completed += 1;
        if (completed >= arr.length) {
          callback(null);
        } else {
          iterate();
        }
      }
    });
  };
  iterate();
};
