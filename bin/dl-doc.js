const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/documents.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = __dirname + '/../../../token-doc.json';

// Load client secrets from a local file.
fs.readFile(__dirname + '/../../../credentials-doc.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Docs API.
  authorize(JSON.parse(content), printDocTitle);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the title of a sample doc:
 * https://docs.google.com/document/d/195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth 2.0 client.
 */
function printDocTitle(auth) {
  const docs = google.docs({version: 'v1', auth});
  docs.documents.get({
    documentId: process.argv[2],
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    
    var out = [];
    var newobj = {}, newarr = [], newarrobj = {};
    var currobject, currarr, arrstart, arrname;
    var add = true;

    fs.writeFileSync("bin/body.json", JSON.stringify(res.data.body.content, null, 2))

    res.data.body.content.forEach(function(d){

      if (d.paragraph && d.paragraph.elements && add) {

        var text = "";
        d.paragraph.elements.forEach(function(el){

          if (el.textRun && el.textRun.textStyle.link) {
            text += "<a href='" + el.textRun.textStyle.link.url + "'>" + el.textRun.content.split("\n").join("") + "</a>"
          } else if (el.textRun) {

            var t = el.textRun.content.split("\n").join("");

            if (t != ":ignore" && t != "" && el.textRun.textStyle.bold) {
              text += "<strong>"
            }

            if (t != ":ignore" && t != "" && el.textRun.textStyle.italic) {
              text += "<em>"
            }

            text += t;

            if (t != ":ignore" && t != "" && el.textRun.textStyle.bold) {
              text += "</strong>"
            }

            if (t != ":ignore" && t != "" && el.textRun.textStyle.italic) {
              text += "</em>"
            }
          }
        })

        if (text == ":ignore") {

          add = false;

        } else if (text.indexOf("{.") > -1) {
          newobj = {type: text.split("{.")[1].replace("}", "")};
          currobject = true;

        } else if (currobject && text == "{}") {

          out.push(newobj);
          currobject = false;


        } else if (currobject && text.indexOf("[.") > -1) {

          currarr = true;
          arrname = text.replace("[.", "").replace("]", "");

        } else if (currarr && text != "[]") {

          var split = text.split(":");
          var varname = split[0].trim();

          if (!arrstart) {
            arrstart = varname;
            newarrobj = {}
          } else if (arrstart == varname) {
            newarr.push(newarrobj);
            newarrobj = {};
          }

          split.shift();

          if (varname != "") {
            newarrobj[varname] = split.join(":").trim();
          }

        } else if (currarr && text == "[]") {

          newarr.push(newarrobj);
          newobj[arrname] = newarr;
          currarr = false;
          newarr = [];
          newarrobj = {};
          arrstart = undefined;

        } else if (currobject && text.indexOf(":") > -1) {

          var split = text.split(":");
          var varname = split[0].trim();
          split.shift();
          newobj[varname] = split.join(":").trim();

        } else if (text.indexOf(":") > -1 && text.indexOf("a href") == -1) {

          var split = text.split(":"); 
          out.push({
            type: split[0].trim(),
            value: split[1].trim()
          })

        } else if (text != "") {
          out.push({
            type: "text",
            value: text
          })
        }
      }
    })

    fs.writeFileSync("data/doc.json", JSON.stringify(out, null, 2));

  });
}