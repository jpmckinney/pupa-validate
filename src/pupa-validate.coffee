#!/usr/bin/env coffee

fs = require 'fs'
path = require 'path'

_ = require 'underscore'
async = require 'async'
# @see https://github.com/visionmedia/commander.js
cli = require('cli').enable('status')
request = require 'request'
JSONStream = require 'JSONStream'
JSV = require('jsv').JSV

# Maps "_type" values of JSON documents to JSON Schema URLs.
type_url_map = {}
# Maps URLs to parsed JSON representations of JSON Schema.
url_json_map = {}
# Maps URLs to JSV JSONSchema objects.
url_schema_map = {}

report = {}

env = JSV.createEnvironment() # "strict" is slower
env.setOption('defaultSchemaURI', 'http://json-schema.org/draft-03/schema#')
default_schema = env.getDefaultSchema()

# Returns all non-local references within a schema that have not yet been resolved.
get_references = (schema) ->
  references = []
  if Object.prototype.toString.call(schema) == '[object Object]'
    for own key, value of schema
      if value.$ref and value.$ref not of url_json_map and value.$ref[0] isnt '#'
        references.push(value.$ref)
      references = references.concat(get_references(value))
  references

# Registers schemas with JSV.
register_schemas = (urls, callback) ->
  # Queue the HTTP requests to send in parallel.
  queue = []
  urls.forEach (url) ->
    queue.push (notify) ->
      cli.info("GET #{url}")
      parser = JSONStream.parse()
      parser.on 'data', (data) ->
        url_json_map[url] = data
        url_schema_map[url] = env.createSchema(data, default_schema, url)
        notify(null) # notify async the process is done
      request(url).pipe(parser)

  # Breadth-first search the schemas for references.
  async.parallel queue, ->
    argument = []
    for url in urls
      argument = argument.concat(get_references(url_json_map[url]))
    if argument.length
      register_schemas(_.uniq(argument), callback)
    else # We're at depth.
      callback()

validate = (data) ->
  instance_json = JSON.parse(data)
  type = instance_json._type
  if type
    url = type_url_map[type]
    if url
      schema = url_schema_map[url]
      if schema
        errors = schema.validate(instance_json).errors
        if errors.length
          cli.error(JSON.stringify(errors))
      else
        cli.error("No schema for #{url}")
    else
      cli.error("No URL for #{type}")
  else
    cli.error("No _type for #{data}")

finish = ->
  # Finish and print the report.
  report.end = new Date()
  report.time = (report.end.getTime() - report.start.getTime()) / 1000.0
  cli.info(JSON.stringify(report))
  process.exit()

# Configure the option parser.
cli.setUsage('pupa-validate [OPTIONS] [TYPE URI ...]')
cli.width = 100
cli.option_width = 30
cli.parse
  output_dir: [
    'o'
    'The directory or Redis address (e.g. redis://localhost:6379/0) from which to read JSON documents'
    'string'
    path.join(process.cwd(), 'scraped_data')
  ]

cli.main (args, options) ->
  report.start = new Date()
  report.plan =
    options: options
    arguments: args

  type_url_map[args.shift()] = args.shift() while args.length

  register_schemas (url for own type, url of type_url_map), ->
    matches = options.output_dir.match(///^redis://([^/:]+)?(?::(\d+))?(?:/(\d+))?$///)
    if matches
      redis = require('redis')

      matches[1] ?= '127.0.0.1'
      matches[2] ?= '6379'
      matches[3] ?= '0'

      client = redis.createClient(matches[2], matches[1])

      client.select matches[3], ->
        client.keys '*', ($, keys) ->
          client.mget keys, ($, documents) ->
            for document in documents
              validate(document)
            finish()
    else
      glob = require('glob')

      glob '*.json', cwd: options.output_dir, ($, files) ->
        for file in files
          validate(fs.readFileSync(path.join(options.output_dir, file)))
        finish()

        # The asynchronous version runs slower and requires graceful-fs:
        # queue = []
        # files.forEach (file) ->
        #   queue.push (notify) ->
        #     fs.readFile path.join(options.output_dir, file), (err, data) ->
        #       validate(data)
        #       notify(null)
        # async.parallel queue, finish
