/* jshint node: true */

var express = require('express');
var methods = require('methods');

// add `all`
methods.push('all');

/*
 * expose
 */

module.exports = ctrlr;

/*
 * ctrlr
 *
 *    var postsCtrlr = ctrlr()
 *      .before(function(req, res, next) {
 *        // ...
 *      })
 *      .index(function(req, res, next) {
 *        // ...
 *      })
 *      .new(function(req, res, next) {
 *        // ...
 *      })
 *      .action("/rss", function(req, res, next) {
 *        // ...
 *      });
 *
 *    app.use("/posts", postsCtrlr.router());
 *
 *    GET /posts/rss
 *    GET /posts
 *    GET /posts/new
 *
 * @param {String} path (eg /posts)
 * @return {this}
 * @api public
 */

function ctrlr(opts) {
  return new Controller(opts);
}

/*
 * Controller
 *
 * @param {String} path
 * @constructor
 * @api private
 */

function Controller(opts) {
  this._router = express.Router(opts);
  this._actions = [];
}

// crud map
var cruds = [
  {action: 'index',    method: 'GET',     path: "/"},
  {action: 'new',      method: 'GET',     path: "/new"},
  {action: 'create',   method: 'POST',    path: "/"},
  {action: 'show',     method: 'GET',     path: "/:id"},
  {action: 'edit',     method: 'GET',     path: "/:id/edit"},
  {action: 'update',   method: 'PUT',     path: "/:id"},
  {action: 'patch',    method: 'PATCH',   path: "/:id"},
  {action: 'destroy',  method: 'DELETE',  path: "/:id"},
];

// crud actions array
var crudActions = cruds.map(function(obj) {
  return obj.action;
});

/*
 * return the router applied
 *
 * @return {Router}
 * @api public
 */

Controller.prototype.router = function() {
  var actions = sortActions(this._actions);
  var self = this;
  var i = 0;
  var len = actions.length;
  for(; i<len; i++) {
    var action = actions[i];
    if ('all' === action.verb) {
      self._router.use(action.cb);
    } else {
      self._router[action.verb](action.path, action.cb);
    }
  }
  return this._router;
};

/*
 * custom actions
 *
 * @param {String} path
 * @param {Object} opts
 * @param {Function} cb
 * @return {this} chainable
 * @api public
 */

Controller.prototype.action = function(path, opts, cb) {
  if ('function' === typeof opts) {
    cb = opts;
    opts = {};
  }
  opts.method = opts.method || 'GET';
  _action('action', opts.method, path).call(this, cb);
  return this;
};

/*
 * before actions
 *
 * @param {Function} cb
 * @return {this} chainable
 * @api public
 */

Controller.prototype.before = _action('before', 'ALL', null);

/*
 * map default crud actions
 *
 * @param {Function} cb
 * @return {this} (chainable)
 * @api public
 */

cruds
  .forEach(function(c) {
    Controller.prototype[c.action] = _action(c.action, c.method, c.path);
  });

/*
 * actions
 *
 * @param {String} action
 * @param {String} verb (eg. GET, POST, PUT, etc...)
 * @param {String} path
 * @return {Function}
 */

function _action(action, verb, path) {
  if (path && !/^\//.test(path)) {
    path = "/"+path; // prefix leading / if none
  }

  verb = verb.toLowerCase();
  if (methods.indexOf(verb) === -1) {
    throw new Error('`'+verb+'` is not a valid VERB');
  }

  return function(cb) {
    if (hasCollision.call(this, verb, path)) {
      throw new Error('`'+path+'` is already defined');
    }

    this._actions.push({
      action: action,
      verb: verb,
      path: path,
      cb: cb,
      _index: crudi(action)
    });
    return this;
  };
}

/*
 * checks for collision
 *
 * @param {String} verb
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

function hasCollision(verb, path) {
  if ('all' === verb) { // `all` does not collide, it's for 'all'
    return false;
  }

  var actions = this._actions;
  var i = 0;
  var len = actions.length;
  for(; i<len; i++) {
    var action = actions[i];
    if (verb === action.verb && path === action.path) {
      return true;
    }
  }
  return false;
}

/*
 * return crud action index
 *
 * @param {String} action
 * @return {Number}
 * @api private
 */

function crudi(action) {
  return crudActions.indexOf(action);
}

/*
 * sort actions
 *
 * 1. befores
 * 2. actions
 * 3. cruds
 *
 * @param {Array} actions
 * @return {Array}
 * @api private
 */

function sortActions(actions) {
  return actions
    .sort(function(a, b) {  // by _index (puts cruds are in order, and at the bottom of the list)
      return a._index - b._index;
    })
    .sort(function(a, b) { // move befores to the top
      return ('action' === a.action && 'before' === b.action) ? 1 : 0;
    });
}

