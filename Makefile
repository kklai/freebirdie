download:
	node bin/dl-sheet.js 1qwUsVIlGFlc4uUJpNKAE9mK7pao6DxXgMbL8pIoIFBA main rows
	node bin/dl-doc.js 1ta3l-5GHImK4pnwjtBKOlxwct45tgwLlpPiOQw77CEw

crop-vid:
	for name in public/vid/*.mp4; do \
		ffmpeg -y -i $${name} -filter:v "crop=720:720:50:0,scale=600:-2" -vcodec h264 -acodec aac -strict -2 $${name%%.*}-cropped.mp4; \
	done

poster:
	for name in public/vid/*.mp4; do \
		ffmpeg -y -i $${name} -ss 00:00:01.000 -vframes 1 $${name%%.*}.jpg ; \
	done

sprite:
	montage public/sprite/*.jpg \
	-tile 10x -geometry 50x50+0+0 -background none public/people.jpg
	ls public/sprite/*.jpg | awk ' BEGIN { ORS = ""; print "["; } { print "\/\@"$0"\/\@"; } END { print "]"; }' | sed "s^\"^\\\\\"^g;s^\/\@\/\@^\", \"^g;s^\/\@^\"^g" > data/spritedata.json

copy:
	pbcopy < public/index.html

copya:
	pbcopy < public/_index.html

copyb:
	pbcopy < public/_cssscript.html

upload:
	gsutil cp public/* gs://interactive.thestandnews.com/FOLDER
