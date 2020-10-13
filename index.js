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
var d3 = require("d3v4");

function compile() {

	var data = {};

	var datafolder = fs.readdirSync(currentPath + "/data");

	datafolder.forEach(function(file){

		if (file == "spritedata.txt") {
			var dat = fs.readFileSync(currentPath + "/data/" + file, "utf8");
			dat = dat.split("\n");
			data.spritedata = dat;

			data.spritedata.forEach(function(d,i){
				data.spritedata[i] = d.replace("public/sprite/", "").replace(".jpg", "")
			})
		} else {
			var dat = fs.readFileSync(currentPath + "/data/" + file, "utf8");
			dat = JSON.parse(dat);
			data[file.replace(".json", "")] = dat;
		}
	});

	var processdata = require(currentPath + "/bin/process-data.js", "utf8");
	data = processdata.process(data);

	var settings;
	if (fs.existsSync(currentPath + "/settings.json")) {
		settings = fs.readFileSync(currentPath + "/settings.json", "utf8");
		settings = JSON.parse(settings);
	}

	var script = fs.readFileSync(currentPath + "/src/script.js", "utf8");

	var c = child.exec("lessc " + currentPath + "/src/style.less " + currentPath + "/public/style.css", (err, stdout, stderr) => {

		if (err) { console.log(err); }

	}).on("exit", function(){

		var html = fs.readFileSync(currentPath + "/src/index.jst.html", "utf8");

		var partial_files = fs.readdirSync(currentPath + "/src/");
		partial_files = partial_files.filter(d => d.indexOf(".html") > -1 && d.indexOf("index.") == -1)

		var partials = {};

		partial_files.forEach(function(partial){
			var h = fs.readFileSync(currentPath + "/src/" + partial, "utf8");
			partials[partial.replace(".html", "")] = ejs.render(h, {data: data, d3: d3}); 
		})

		if (settings && settings.pages) {

			settings.pages.forEach(function(page){

				var out = "";

				var ejs_rendered = ejs.render(html, {data: data, d3: d3, partials: partials, page: page});

				if (data[page] && data[page].filter(d => d.type == "summary")[0]) {
					out += "<div class='g-meta' style='display: none;'>" + data[page].filter(d => d.type == "summary")[0].value + "</div>"
				} else if (ejs_rendered.split('<div class="g-text">').length > 1) {
					out += "<div class='g-meta' style='display: none;'>" + ejs_rendered.split('<div class="g-text">')[1].split('</div>')[0] + "</div>"
				}

				var style = fs.readFileSync(currentPath + "/public/style.css", "utf8");
				out += "<style>\n";
				out += style;
				out += "</style>\n";

				out += ejs_rendered

				out += "\n<script>\n";
				out += script;
				out += "\n</script>";

				fs.writeFileSync(currentPath + "/public/" + page + ".html", out);
			})

		} else {

			var out = "";

			var ejs_rendered = ejs.render(html, {data: data, d3: d3, partials: partials});

			if (data.doc.filter(d => d.type == "summary")[0]) {
				out += "<div class='g-meta' style='display: none;'>" + data.doc.filter(d => d.type == "summary")[0].value + "</div>"
			} else if (ejs_rendered.split('<div class="g-text">').length > 1) {
				out += "<div class='g-meta' style='display: none;'>" + ejs_rendered.split('<div class="g-text">')[1].split('</div>')[0] + "</div>"
			}

			var style = fs.readFileSync(currentPath + "/public/style.css", "utf8");
			out += "<style>\n";
			out += style;
			out += "</style>\n";

			out += ejs_rendered

			out += "\n<script>\n";
			out += script;
			out += "\n</script>";

			fs.writeFileSync(currentPath + "/public/index.html", out);
		}

		console.log("Recompiling...");
	});

}

if (arg == "new") {

	var files = ["/src/index.jst.html", "/src/base.less", "/src/style.less", "/src/script.js", "/Makefile", "/bin/dl-sheet.js", "/bin/dl-doc.js", "/bin/process-data.js"];

	if (!fs.existsSync(currentPath + "/src")) {
		console.log("Creating src folder...");
		fs.mkdirSync(currentPath + "/src");
	}

	if (!fs.existsSync(currentPath + "/bin")) {
		console.log("Creating bin folder...");
		fs.mkdirSync(currentPath + "/bin");
	}

	if (!fs.existsSync(currentPath + "/public")) {
		console.log("Creating public folder...");
		fs.mkdirSync(currentPath + "/public");
	}

	if (!fs.existsSync(currentPath + "/data")) {
		console.log("Creating data folder...");
		fs.mkdirSync(currentPath + "/data");
	}

	files.forEach(function(f){
		console.log("Copying " + f + " over...");
		fs.copyFile(__dirname + f, currentPath + f, (err) => {
			if (err) throw err;
		});
	});

	child.exec("npm install googleapis", function(err, stdout, stderr) {
		if (err) { console.error(err); return; }
	});

	child.exec("npm install lessc", function(err, stdout, stderr) {
		if (err) { console.error(err); return; }
	});

} else if (arg == "make") {

	compile();

} else {

	compile();

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