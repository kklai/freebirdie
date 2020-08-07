#!/usr/bin/env node

var fs = require("fs");
var { exec } = require("child_process");
var arg = process.argv[2];
var ejs = require("ejs");
var currentPath = process.cwd();
var express = require('express');
var serveStatic = require('serve-static');
var serveIndex = require('serve-index');
var SocketServer = require('ws').Server;
var chokidar = require('chokidar');
var child = require('child_process');


if (arg == "new") {

	var files = ["/src/index.jst.html", "/src/base.less", "/src/style.less", "/src/script.js", "/Makefile", "/bin/dl-sheet.js", "/bin/compile.js"];

	if (!fs.existsSync(currentPath + "/src")) {
	    fs.mkdirSync(currentPath + "/src");
	}

	if (!fs.existsSync(currentPath + "/bin")) {
	    fs.mkdirSync(currentPath + "/bin");
	}

	if (!fs.existsSync(currentPath + "/public")) {
	    fs.mkdirSync(currentPath + "/public");
	}

	if (!fs.existsSync(currentPath + "/data")) {
	    fs.mkdirSync(currentPath + "/data");
	}

	files.forEach(function(f){
		fs.copyFile(__dirname + f, currentPath + f, (err) => {
		  if (err) throw err;
		});
	});

} else {

	function compile() {

		var out = "";

		var c = child.exec("lessc " + currentPath + "/src/style.less " + currentPath + "/public/style.css");

		c.on("exit", function(){
			var style = fs.readFileSync(currentPath + "/public/style.css", "utf8");
			out += "<style>\n";
			out += style;
			out += "</style>\n"

			var html = fs.readFileSync(currentPath + "/src/index.jst.html", "utf8");
			var doc = fs.readFileSync(currentPath + "/data/doc.json");
			doc = JSON.parse(doc);

			var rows = fs.readFileSync(currentPath + "/data/rows.json", "utf8");
			rows = JSON.parse(rows)

			out += ejs.render(html, {doc: doc, rows: rows});
			out += "\n<script>\n";
			out += "var data = " + JSON.stringify(rows) + "\n";
			out += "\n</script>";


			var script = fs.readFileSync(currentPath + "/src/script.js", "utf8");

			out += "\n<script>\n";
			out += script;
			out += "\n</script>";

			fs.writeFileSync(currentPath + "/public/index.html", out);

			console.log("Recompiling...");
		})
	}

	fs.watch(currentPath + '/src', (eventType, filename) => {
		console.log(filename + " changed...");
		compile();
	})

	fs.watch(currentPath + '/data', (eventType, filename) => {
		console.log(filename + " changed...");
		compile();
	})

	// this is from https://github.com/1wheel/hot-server
	
	var defaults = {port: 3989, dir: currentPath + '/public'} 
	var args = require('minimist')(process.argv.slice(2))
	var {port, dir} = Object.assign(defaults, args)
	dir = require('path').resolve(dir) + '/'

	// set up express static server with a websocket
	var server = express()
	  .get('*', injectHTML)
	  .use(serveStatic(dir))
	  .use('/', serveIndex(dir))
	  .listen(port)
	  .on('listening', () => {
	    child.exec('open http://localhost:' + port)
	    console.log('hot-server http://localhost:' + port)
	  })
	  
	process.on('uncaughtException', (err => 
	  err.errno == 'EADDRINUSE' ? server.listen(++port) : 0)) //inc port if in use

	// append websocket/injecter script to all html pages served
	var wsInject = fs.readFileSync(__dirname + '/bin/ws-inject.html', 'utf8')
	function injectHTML(req, res, next){
	  try{
	    var path = req.params[0].slice(1)
	    if (path.slice(-1) == '/') path = path + '/index.html'
	    if (path == '') path = 'index.html'
	    if (path.slice(-5) != '.html') return next()

	    res.send(fs.readFileSync(dir + path, 'utf-8') + wsInject)
	  } catch(e){ next() }
	}

	// if a .js or .css files changes, load and send to client via websocket
	var wss = new SocketServer({server})
	chokidar
	  .watch(dir, {ignored: /node_modules|\.git|[\/\\]\./ })
	  .on('change', path => {
	    var str = fs.readFileSync(path, 'utf8')
	    var path = '/' + path.replace(__dirname, '')

	    var type = 'reload'
	    if (path.includes('.js'))  type = 'jsInject'
	    if (path.includes('.css')) type = 'cssInject'

	    var msg = {path, type, str}
	    wss.clients.forEach(d => d.send(JSON.stringify(msg)))
	  })

}