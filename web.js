var express = require('express');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var cheerio = require('cheerio')
var mammoth = require("mammoth");



var app = express(); 
app.use(fileUpload());
app.use(express.static('public'));



app.post('/upload-indesign', function(req, res) {
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }
 
    indesign = req.files.indesign;
    text = indesign.data.toString('utf-8');
    text = handleHtml(text);

    //res.set({"Content-Disposition":"attachment; filename=\"clean_up_" + indesign.name + "\""});
    res.send(fillTemplate(text));
});





app.post('/upload-word', function(req, res) {
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }
    word = req.files.word;

    //No return value as it uses promise
    handleWord(word.data,res,(word.name.replace('docx','html')));
});




function handleHtml(text){
	text = text.replace(/ class="TEXT-TRANSFORMATION_endnote-superscript"/g,"")
	text = text.replace(/<sup>\s*(\d+)\s*<\/sup>/g,"<sup><a href='#endnote-$1' id='#endnote-sup-$1'>$1</a></sup>");

    var $ = cheerio.load(text)
    $('li.ENDNOTES-FOOTNOTES_endnotes-numbered').each(function(i, elem) {
      $(this).html($(this).html() + `<a href="#endnote-sup-${i+1}" id="endnote-${i+1}"> View in article</a>`);
    });
    var output =  $('body').html();
	 return output;
}




function handleWord(buff,res,name){
  mammoth.convertToHtml({buffer: buff})
      .then(function(result){
          var html = result.value; // The generated HTML 
          var messages = result.messages; // Any messages, such as warnings during conversion

          //res.set({"Content-Disposition":"attachment; filename=\"clean_up_" + name + "\""});
          
          res.send(fillTemplate(html));
      })
      .done();
}




function fillTemplate(rteText){
  var string = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset=utf-8>
</head>
<body>
<h2>RTE CONTENT</h2>
<textarea rows="30" cols="100">
${rteText}
</textarea>
</body>
</html>
`;
return string;
}


app.listen(process.env.PORT || 3000, function () {});