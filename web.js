var express = require('express');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var cheerio = require('cheerio')
var mammoth = require("mammoth");
//var tidy = require('htmltidy').tidy;
var beautify = require('js-beautify').html;


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
  var options = {
      styleMap: [
          "p[style-name='Quote'] => blockquote"
      ]
  };
  mammoth.convertToHtml({buffer: buff},options)
      .then(function(result){
          var html = result.value; // The generated HTML 
          var messages = result.messages; // Any messages, such as warnings during conversion
          console.log(messages);

          outputToClient(html, res);
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

function outputToClient(html, res){
      var $ = cheerio.load(html)
      var endnoteOlElement;
        $('ol').find('li').each(function (index, element) {
        if(typeof endnoteOlElement === 'undefined'){
          var thisId = $(element).attr('id');
          if(thisId && thisId.match(/^endnote-/)){
            $(element.parent).attr('id','endnote')
            endnoteOlElement = $(element.parent);
            $(element.parent).remove();
          }
        }
      });

        // Replace the [N] to N for sup script anchors
      $('sup').find('a').each(function(index, element) {
        var supText = $(this);
        if(supText.text() && supText.text().match(/\[\d+\]/) ){
          supText.text(supText.text().replace('[','').replace(']',''));
        }
      });


      // Replace arrow with ' View in article' for all li in endnotes ol  
        var E = cheerio.load(cheerio.load('').root().append(endnoteOlElement).html());
      E('li').find('a').each(function(index, element) {
        var link = E(this);
        if(link.attr('href') && link.attr('href').match(/^#endnote/)){
          link.text(' View in article');
        }
      });


  var rte = beautify($.html(), { indent_size: 2 });
  var endnote = beautify(E.html(), { indent_size: 2 });


  var string = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset=utf-8>
<link href='https://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
<style>
*{
  font-family: 'Open Sans'
}
html,body{
  margin: 0px;
  padding: 0px;
}
.Header{
  background-color: black;
  margin: 0px;
  font-size: 20px;
  padding: 14px;
  color: white;
}
textarea{
  display:block;
  margin-left:auto;
  margin-right:auto;
}
h2{
  padding:8px;
}
</style>
</head>
<body>
<div class="Header"><a style="color:white;" href="/">&larr; Back</a> Publishing Workflow Automation Tool - Prototype</div>
<h2>RTE CONTENT</h2>
<textarea rows="30" cols="100">
${rte}
</textarea>
<h2>ENDNOTES CONTENT</h2>
<textarea rows="30" cols="100">
${endnote}
</textarea>
<br>
<br>
</body>
</html>
`;

      res.send(string);
      fs.writeFileSync(__dirname + '/log.html', rte,'utf8');
}


app.listen(process.env.PORT || 3000, function () {});