var express = require('express');
var fileUpload = require('express-fileupload');
var fs = require('fs');

var app = express(); 
app.use(fileUpload());



 
app.post('/upload', function(req, res) {
    var sampleFile;
 
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }
 
    indesign = req.files.indesign;
    text = indesign.data.toString('utf-8');
    res.set({"Content-Disposition":"attachment; filename=\"clean_up_" + indesign.name + "\""});
    res.send(text);
});





app.listen(process.env.PORT || 3000, function () {});