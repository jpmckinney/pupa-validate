var assert = require('assert')
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
];

function log(message) {
  if (messages.length) {
    assert.equal(message, messages.shift());
  }
  else {
    var json = JSON.parse(message);
    assert.ok('uri' in json[0]);
    delete json[0].uri;
    assert.deepEqual(json, [{
      'schemaUri': 'http://www.popoloproject.com/schemas/organization.json#/properties/id'
    , 'attribute': 'type'
    , 'message': 'Instance is not a required type'
    , 'details': ['string', 'null']
    }]);
  }
}

var args = ['organization', 'http://www.popoloproject.com/schemas/organization.json#']
  , options = {output_dir: 'test/fixtures'}
  , logger = {info: log, error: log};

validator(args, options, logger, function () {
  assert.equal(messages.length, 0);
});
