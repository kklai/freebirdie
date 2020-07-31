download:
	node bin/dl-sheet.js 1qwUsVIlGFlc4uUJpNKAE9mK7pao6DxXgMbL8pIoIFBA main rows

compile: 
	node bin/compile.js

all:
	Make download
	Make compile