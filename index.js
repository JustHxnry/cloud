var formidable = require('formidable');
var fs = require('fs');
var express = require('express');
var session = require('express-session');
var app = express();
var format = require('./format');
var fileformat = require('./files');
var fileDeleteFormat = require('./deleteFiles');
var fileUploadProcess = require('./uploadFileProcess');
var shareFiles = require('./shareFiles');
var unshareFiles = require('./unshareFiles');
var dfiles = fs.readdirSync(__dirname+"/files");
var sharingService = require('./sharingService');
require('dotenv').config();


app.use(session({
  secret: 'nice try',
  resave: true,
  saveUninitialized: true
}));
app.use(function (req, res, next) {
  if (req.session.loggedIn === 'true') {
    filesScanner.forEach((file) => {
       next();
    });
} else {
    const auth = {login: process.env.LOGIN, password: process.env.PASSWORD} 

    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

    
    if (login === auth.login && password === auth.password) {
        req.session.loggedIn = true;
        req.session.username = login;
        next();
    } else {
        res.set('WWW-Authenticate', 'Basic realm="401"');
        res.status(401).send('Authentication required.');
    }
}
});
app.use(sharingService);
app.use("/files",express.static(__dirname + '/files'));

app.post('/upload', async (req, res) => {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    var oldpath = files.file.filepath;
    var newpath = __dirname+"/files/"+files.file.originalFilename;
    fs.rename(oldpath, newpath, function (err) {
      if (err) throw err;
      let filename = files.file.originalFilename;
      filename = encodeURIComponent(filename.trim())
      fileUploadProcess(req, res, {
        view: "GET /files/"+filename,
        delete: "GET /files/"+filename+"/delete",
        all_files: "GET /files"
      });
      res.end();
    });
  });
});

app.get('/files', async (req, res) => {
  var files = fs.readdirSync(__dirname+"/files");
  fileformat(req, res, files);
  console.log(files);
});

app.get('/delete', async (req, res) => {
  var files = fs.readdirSync(__dirname+"/files");
  fileDeleteFormat(req, res, files);
});

app.get('/share', async (req, res) => {
  var files = fs.readdirSync(__dirname+"/files");
  shareFiles(req, res, files);
});

app.get('/unshare', async (req, res) => {
  var files = fs.readdirSync(__dirname+"/files");
  unshareFiles(req, res, files);
});

app.get('/files/:file/delete', async (req, res) => {
  try {
    fs.unlinkSync(__dirname+"/files/"+req.params.file);
    res.redirect("/delete");
  } catch (err) {
    console.error(err);
    format(req, res, [ req.params.file+" wasn't deleted" ]);
  }
});

app.get('/upload', (req, res) => {
  res.sendFile(__dirname+"/upload.html");
});

app.get('*', async (req, res) => {
  format(req, res, {
    upload: "GET /upload",
    get: "GET /files",
    delete: "GET /delete"
  });
});

app.listen(5566, () => {
  console.log("Listening on port 5566");
});