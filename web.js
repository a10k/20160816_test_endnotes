var express = require('express');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var cheerio = require('cheerio')
var mammoth = require("mammoth");
//var tidy = require('htmltidy').tidy;
var beautify = require('js-beautify').html;
var Entities = require('html-entities').AllHtmlEntities;
entities = new Entities();

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
          "p[style-name='Quote'] => blockquote",
          "r[style-name='Quote Char'] => blockquote",
      ],
      convertImage:mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
              return {
                  src: "TBD"
              };
          });
      })
  };
  

  mammoth.convertToHtml({buffer: buff},options)
      .then(function(result){
          var html = result.value; // The generated HTML 
          var messages = result.messages; // Any messages, such as warnings during conversion
          //console.log(messages);

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
      //Load HTML
      html = beautify(html, { indent_size: 2 });

      //Preprocess file for [DUP:RULES]
      html = html.split('\n');
      var newHtml = [];
      html.map(function(eachLine){
        
      //Get pure inner text
      plainText = cheerio.load(eachLine).root().text();
      plainText = plainText.replace(/^\s+/,'');
      plainText = plainText.replace(/\s+$/,'');



        //BEGIN SIDEBAR DIV
        if(plainText === "[DUP:begin-sidebar]"){
          eachLine = '<div class="aside">';  
        }
        //END SIDEBAR DIV
        if(plainText === "[DUP:end-sidebar]"){
          eachLine = '</div>';  
        }




        //BEGIN QUOTE
        if(plainText === "[DUP:begin-quote]"){
          eachLine = '<blockquote><span class="text"><span class="quotes">';  
        }
        //BEGIN QUOTE ATTRIBUTION
        if(plainText === "[DUP:begin-attribution]"){
          eachLine = '</span></span><span class="attribution">';
        }
        //END QUOTE
        if(plainText === "[DUP:end-quote]"){
          eachLine = '</span></blockquote>';  
        }



        //BEGIN pullquote
        if(plainText === "[DUP:begin-pullquote]"){
          eachLine = '<blockquote><span class="text">';  
        }
        //END pullquote
        if(plainText === "[DUP:end-pullquote]"){
          eachLine = '</span></blockquote>';  
        }

        //Insert figure 
        if(plainText.match(/\[DUP:insert\-figure(\d+)\]/)){
          var imageId = plainText.replace(/\[DUP:insert\-figure(\d+)\]/,'$1');
          eachLine = `\n<img src="/content/dam/dup-us-en/articles/SLUG-TBD/${imageId}.jpg" class="-rwd" alt="" data-id="${imageId}"/>\n`;  
        }



        newHtml.push(eachLine);

      });
      html = newHtml.join('\n');



      //Cheerio processing
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

      //Fix double sup > sup
      $('sup').find('sup').each(function(index, element) {
        var supSup = $(this);
        if(supSup.parent()[0].children.length === 1){
          var sup = $(element.parent)
          sup.html($(element).html())
        }
      });

      //Find and prepare h2 ids and build an array
      var h2Array = [];
      $('h2').each(function(index, element) {
        var heading = $(this);
        var headingText = heading.text()||'';
        var headingId = headingText.replace(/[^a-zA-Z0123456789]+/g,'-').toLowerCase().replace(/^\-/,'').replace(/\-$/,'');
        h2Array.push({id:headingId, text: headingText});
        $(element).attr('id', headingId)
      });


      // Replace arrow with ' View in article' for all li in endnotes ol  
      var E = cheerio.load(cheerio.load('').root().append(endnoteOlElement).html());
      E('li').find('a').each(function(index, element) {
        var link = E(this);
        if(link.attr('href') && link.attr('href').match(/^#endnote/)){
          link.text(' View in article');
        }
      });




  var h2Text = h2Array.map(function(heading){
    return `<li><textarea cols="40" rows="2">${heading.text}</textarea><textarea cols="20" rows="2">#${heading.id}</textarea></li>`;
  }).join('\n\n');
  if(h2Text){
    h2Text = '<h2>IN-ARTICLE NAVIGATION</h2><ul>'+h2Text+'</ul>';
  }
  var rte = $.html();
  var endnote = E.html();


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
li textarea {
    display: inline-block;
    margin: 5px;
}
li{
    list-style-type: none;
}
</style>
</head>
<body>
<div class="Header"><a style="color:white;" href="/">&larr; Back</a> Publishing Workflow Automation Tool - Prototype</div>
${h2Text}
<h2>RTE CONTENT</h2>
<textarea rows="30" cols="100">
${entities.encode(rte)}
</textarea>
<h2>ENDNOTES CONTENT</h2>
<textarea rows="30" cols="100">
${entities.encode(endnote)}
</textarea>
<br>
<br>
</body>
</html>
`;

      res.send(string);
      //fs.writeFileSync(__dirname + '/log.html', rte,'utf8');
}


app.listen(process.env.PORT || 3000, function () {});