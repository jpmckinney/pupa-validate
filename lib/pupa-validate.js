var fs = require('fs')
  , path = require('path')
  , JSONStream = require('JSONStream')
  , JSV = require('JSV').JSV
  , async = require('async')
  , uniq = require('lodash.uniq')
  , request = require('request');

module.exports = function () {
  var env = JSV.createEnvironment(); // "strict" is slower
  env.setOption('defaultSchemaURI', 'http://json-schema.org/draft-03/schema#');
  var default_schema = env.getDefaultSchema();

  // Maps "_type" values of JSON documents to JSON Schema URLs.
  var type_url_map = {};

  // Maps URLs to parsed JSON representations of JSON Schema.
  var url_json_map = {};

  // Maps URLs to JSV `JSONSchema` objects.
  var url_schema_map = {};

  // Returns all non-local references within a schema that have not yet been resolved.
  function get_references(json) {
    var key, value, references = [];
    if (Object.prototype.toString.call(json) === '[object Object]') {
      for (key in json) {
        if (json.hasOwnProperty(key)) {
          value = json[key];
          if (value.$ref && !(value.$ref in url_json_map) && value.$ref[0] !== '#') {
            references.push(value.$ref);
          }
          references = references.concat(get_references(value)); // recurse all values
        }
      }
    }
    return references;
  };

  // Registers schemas with JSV.
  function register_schemas(urls, logger, callback) {
    // Queue the HTTP requests to send in parallel.
    var queue = [];
    urls.forEach(function (url) {
      if (!(url in url_json_map)) {
        queue.push(function (notify) {
          var parser = JSONStream.parse();
          parser.on('data', function (json) {
            url_json_map[url] = json;
            url_schema_map[url] = env.createSchema(json, default_schema, url);
            notify(null); // notify async that the process is done
          });
          logger.info('GET ' + url);
          request(url).pipe(parser);
        });
      }
    });

    // Breadth-first search the schemas for references.
    async.parallel(queue, function () {
      var _i, _len, argument = [];
      for (_i = 0, _len = urls.length; _i < _len; _i++) {
        argument = argument.concat(get_references(url_json_map[urls[_i]]));
      }
      if (argument.length) {
        register_schemas(uniq(argument), logger, callback); // recursion
      }
      else { // We're at maximum depth.
        callback();
      }
    });
  };

  // Validate a JSON document.
  function validate_document(data, logger) {
    var instance_json = JSON.parse(data);
    var type = instance_json._type;
    if (type) {
      var url = type_url_map[type];
      if (url) {
        var schema = url_schema_map[url];
        if (schema) {
          var errors = schema.validate(instance_json).errors;
          if (errors.length) {
            logger.error(JSON.stringify(errors));
          }
        }
        else {
          logger.error("No schema for " + url);
        }
      }
      else {
        logger.error("No URL for " + type);
      }
    }
    else {
      logger.error("No _type for " + data);
    }
  };

  // Validate a directory of JSON documents.
  function validate_documents(directory, logger, finish) {
    var matches = directory.match(/^redis:\/\/([^\/:]+)?(?::(\d+))?(?:\/(\d+))?$/);
    if (matches) {
      var redis = require('redis');

      if (matches[1] == null) {
        matches[1] = '127.0.0.1';
      }
      if (matches[2] == null) {
        matches[2] = '6379';
      }
      if (matches[3] == null) {
        matches[3] = '0';
      }

      var client = redis.createClient(matches[2], matches[1]);

      client.select(matches[3], function () {
        client.keys('*', function ($, keys) {
          keys.sort(); // for consistent tests
          client.mget(keys, function ($, documents) {
            var _i, _len;
            for (_i = 0, _len = documents.length; _i < _len; _i++) {
              validate_document(documents[_i], logger);
            }
            if (finish) {
              finish();
            }
          });
        });
      });
    }
    else {
      var glob = require('glob');

      // The asynchronous version runs slower and requires graceful-fs.
      glob('*.json', {
        cwd: directory
      }, function ($, files) {
        var _i, _len;
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          validate_document(fs.readFileSync(path.join(directory, files[_i])), logger);
        }
        if (finish) {
          finish();
        }
      });
    }
  }

  function validator(args, options, logger, finish) {
    var _i, _len, urls = [];
    for (_i = 0, _len = args.length; _i < _len; _i += 2) {
      type_url_map[args[_i]] = args[_i + 1];
      urls.push(args[_i + 1]);
    }

    register_schemas(urls, logger, function () {
      validate_documents(options.output_dir, logger, finish);
    });
  }

  return validator;
};
