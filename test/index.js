/* jshint node: true */

var assert = require('chai').assert;
var request = require('supertest');
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var controller = require('..');

describe('controller', function() {
  var app, server;
  beforeEach(function() {
    app = express();
    app.use(bodyParser());
    app.use(methodOverride());
  });

  describe("CRUD", function() {
    it("#index", function(done) {
      var ctrlr = controller().index(cb(200));
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts")
        .expect(200, 'OK', done);
    });

    it("#new", function(done) {
      var ctrlr = controller().new(cb(200));
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts/new")
        .expect(200, 'OK', done);
    });

    it("#create", function(done) {
      var ctrlr = controller().create(cb('POST'));
      app.use("/posts", ctrlr.router());

      request(app)
        .post("/posts")
        .send({foo: 'bar'})
        .expect(200, {foo: 'bar'}, done);
    });

    it("#show", function(done) {
      var ctrlr = controller().show(cb('PARAMS'));
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts/123")
        .expect(200, {id: '123'}, done);
    });

    it("#edit", function(done) {
      var ctrlr = controller().edit(cb('PARAMS'));
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts/123/edit")
        .expect(200, {id: '123'}, done);
    });

    it("#update", function(done) {
      var ctrlr = controller().update(cb('PUT'));
      app.use("/posts", ctrlr.router());

      request(app)
        .put("/posts/123")
        .send({foo: 'bar'})
        .expect(200, {id: '123', body: {foo: 'bar'}}, done);
    });

    it("#patch", function(done) {
      var ctrlr = controller().patch(cb('PATCH'));
      app.use("/posts", ctrlr.router());

      request(app)
        .patch("/posts/123")
        .send({foo: 'bar'})
        .expect(200, {id: '123', body: {foo: 'bar'}}, done);
    });

    it("#destroy", function(done) {
      var ctrlr = controller().destroy(cb('PARAMS'));
      app.use("/posts", ctrlr.router());

      request(app)
        .del("/posts/123")
        .expect(200, {id: '123'}, done);
    });
  });

  describe("#action", function() {
    it("applies your own defined action", function(done) {
      var ctrlr = controller()
        .action("/new", cb(200))
        .action("/", {method: 'POST'}, cb('POST'));
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts/new")
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'OK');

          request(app)
            .post("/posts")
            .send({foo: "bar"})
            .expect(200, {foo: 'bar'}, done);
        });
    });

    it("throws if not an acceptable verb (method), except `ALL`", function() {
      assert.throw(function() {
        controller()
          .action("/new", {method: 'FOO'}, cb(200));
      }, '`foo` is not a valid VERB');

      assert.doesNotThrow(function() {
        controller()
          .action("/new", {method: 'ALL'}, cb('next'));
      });
    });

    it.skip("actions can be constrained", function(done) {
      var ctrlr = controller()
        .new(cb(200))
        .show(cb(200))
        .action("/:id", {collision: true, constraint: {':id': /\d+/}}, cb(404));
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts/new")
        .end(function(err, res) {
          assert.equal(res.status, 200);

          request(app)
            .get("/posts/123")
            .expect(404, done);
        });
    });
  });

  it("throws on (path && method) collision", function() {
    assert.throw(function() {
      controller()
        .new(cb(200))
        .action("new", cb(200));
    }, '`/new` is already defined');

    assert.throw(function() {
      controller()
        .action("new", cb(200))
        .new(cb(200));
    }, '`/new` is already defined');

    assert.throw(function() {
      controller()
        .action("new", cb(200))
        .action("/new", cb(200));
    }, '`/new` is already defined');

    assert.throw(function() {
      controller()
        .new(cb(200))
        .new(cb(200));
    }, '`/new` is already defined');
  });

  describe("#before", function() {
    it("before all actions", function(done) {
      var ctrlr = controller()
        .before(function(req, res, next) {
          res.locals.foo = 'bar';
          next();
        })
        .action("/new", cb('locals'))
        .update(cb('locals'));
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts/new")
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.deepEqual(res.body, {foo: 'bar'});

          request(app)
            .put("/posts/123")
            .expect(200, {foo: 'bar'}, done);
        });
    });
  });

  describe("action ordering", function() {
    it("orders before -> actions -> cruds", function(done) {
      var ctrlr = controller()
        .index(function(req, res, next) {
          res.locals.order.push(5);
          res.send(res.locals);
        })
        .create(function(req, res, next) {
          res.locals.order.push(4);
          res.send(res.locals);
        })
        .before(function(req, res, next) {
          res.locals.order = [0];
          next();
        })
        .action("/", {method: 'ALL'}, function(req, res, next) {
          res.locals.order.push(2);
          next();
        })
        .before(function(req, res, next) {
          res.locals.order.push(1);
          next();
        })
        .action("/", {method: 'ALL'}, function(req, res, next) {
          res.locals.order.push(3);
          next();
        });
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts")
        .end(function(err, res) {
          assert.deepEqual(res.body, {order: [0, 1, 2, 3, 5]});

          request(app)
            .post("/posts")
            .expect(200, {order: [0, 1, 2, 3, 4]}, done);
        });
    });

    it("maintains crud order, regardless of order definition", function(done) {
      var ctrlr = controller()
        .show(cb('PARAMS'))
        .new(cb(200));
      app.use("/posts", ctrlr.router());

      request(app)
        .get("/posts/new")
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'OK');

          request(app)
            .get("/posts/123")
            .expect(200, {id: '123'}, done);
        });
    });
  });

  it("can define the path to router", function(done) {
    var ctrlr = controller()
      .show(cb('PARAMS'));
    app.use(ctrlr.router("/posts"));

    request(app)
      .get("/posts/12345")
      .end(function(err, res) {
        assert.deepEqual(res.body, {id: "12345"});
        done();
      });
  });

  describe("nested routes", function() {
    it("must define the path to the router function", function(done) {
      var ctrlr = controller()
        .show(cb('PARAMS'));
      app.use("/api", ctrlr.router("/posts/:post_id/comments"));
      app.use("/api", ctrlr.router("/tasks/:task_id/comments"));

      request(app)
        .get("/api/posts/12345/comments/09876")
        .end(function(err, res) {
          assert.deepEqual(res.body, {post_id: "12345", id: "09876"});

          request(app)
            .get("/api/tasks/abcde/comments/54321")
            .end(function(err, res) {
              assert.deepEqual(res.body, {task_id: "abcde", id: "54321"});
              done();
            });
        });
    });

    it("does not capture nested params in the use path", function(done) {
      var ctrlr = controller()
        .show(cb('PARAMS'));
      app.use("/posts/:post_id/comments", ctrlr.router());

      request(app)
        .get("/posts/12345/comments/09876")
        .end(function(err, res) {
          assert.deepEqual(res.body, {id: "09876"});
          done();
        });
    });
  });
});

/*
 * middleware helper
 *
 * @param {String|Number} type
 * @return {Function}
 */

function cb(type) {
  return function(req, res, next) {
    switch(type) {
      case 200:
        res.send(type, 'OK');
        break;
      case 404:
      case 500:
        res.send(type);
        break;
      case 'POST':
        res.send(req.body);
        break;
      case 'PARAMS':
        res.send(req.params);
        break;
      case 'PUT':
      case 'PATCH':
        res.send({id: req.params.id, body: req.body});
        break;
      case 'locals':
        res.send(res.locals);
        break;
      case 'next':
        next();
        break;
    }
  };
}

