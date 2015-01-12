var assert = require('assert')
  , fs = require('fs')
  , path = require('path')
  , glob = require('glob')
  , redis = require('redis')
  , validator = require('../lib/pupa-validate')();

var messages = [
  'GET http://www.popoloproject.com/schemas/organization.json#',
  'GET http://www.popoloproject.com/schemas/other_name.json#',
  'GET http://www.popoloproject.com/schemas/identifier.json#',
  'GET http://www.popoloproject.com/schemas/area.json#',
  'GET http://www.popoloproject.com/schemas/contact_detail.json#',
  'GET http://www.popoloproject.com/schemas/link.json#',
  'GET http://www.popoloproject.com/schemas/membership.json#',
  'GET http://www.popoloproject.com/schemas/post.json#',
  'GET http://www.popoloproject.com/schemas/motion.json#',
  'GET http://www.popoloproject.com/schemas/vote_event.json#',
  'GET http://www.popoloproject.com/schemas/vote.json#',
  'GET http://www.popoloproject.com/schemas/person.json#',
  'GET http://www.popoloproject.com/schemas/group_result.json#',
  'GET http://www.popoloproject.com/schemas/count.json#',
  'GET http://www.popoloproject.com/schemas/speech.json#',

  // Filesystem
  /No _type for \{/,
  function (message) {
    var json = JSON.parse(message);
    assert.ok('uri' in json[0]);
    delete json[0].uri;
    assert.deepEqual(json, [{
      'schemaUri': 'http://www.popoloproject.com/schemas/organization.json#/properties/id'
    , 'attribute': 'type'
    , 'message': 'Instance is not a required type'
    , 'details': ['string', 'null']
    }]);
  },
  /^No _type for \{/,
  'No URL for invalid',

  // Redis
  /No _type for \{/,
  function (message) {
    var json = JSON.parse(message);
    assert.ok('uri' in json[0]);
    delete json[0].uri;
    assert.deepEqual(json, [{
      'schemaUri': 'http://www.popoloproject.com/schemas/organization.json#/properties/id'
    , 'attribute': 'type'
    , 'message': 'Instance is not a required type'
    , 'details': ['string', 'null']
    }]);
  },
  /No _type for \{/,
  'No URL for invalid',
];

function log(message) {
  // process.stdout.write('"' + message + '"\n');
  var expected = messages.shift();
  if (!expected || typeof expected === 'string') {
    assert.equal(message, expected);
  }
  else if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    assert.ok(expected.test(message));
  }
  else {
    expected(message);
  }
}

var args = ['organization', 'http://www.popoloproject.com/schemas/organization.json#']
  , directory = 'test/fixtures'
  , logger = {info: log, error: log};

validator(args, {output_dir: directory}, logger, function () {
  var client = redis.createClient(6379, '127.0.0.1');

  client.select(15, function (err, res) {
    client.flushall(function (err, res) {
      glob('*.json', {cwd: directory}, function ($, files) {
        var array = [];
        files.forEach(function (file) {
          array.push(file, fs.readFileSync(path.join(directory, file)));
        });

        client.mset(array, function (err, res) {
          client.quit();
          validator(args, {output_dir: 'redis://127.0.0.1:6379/15'}, logger, function () {
            assert.equal(messages.length, 0);
          });
        });
      });
    });
  });
});
