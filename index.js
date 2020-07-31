#!/usr/bin/env node

var fs = require("fs");
var { exec } = require("child_process");
var arg = process.argv[2];

if (arg == "new") {

	var currentPath = process.cwd();

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

	console.log("need to write code")

	// compile code

	// run server


}