var express = require('express');
var fileUpload = require('express-fileupload');
var fs = require('fs');

var app = express(); 
app.use(fileUpload());



app.get('/',function(req,res){

	res.send(`<!DOCTYPE html>
<html>
<head>
	<title>TEST PAGE</title>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.0/jquery.slim.min.js"></script>
</head>
<body>
	<form method="post" id="formID" enctype="multipart/form-data" action="/upload">
	    <input type="file" name="indesign">
	</form>
<script type="text/javascript">
  $(function() {
     $("input:file").change(function (){
       document.getElementById("formID").submit();
     });
  });
</script>
<style type="text/css">
</style>
</body>
</html>`);
});

app.post('/upload', function(req, res) {
    if (!req.files) {
        res.send('No files were uploaded.');
        return;
    }
 
    indesign = req.files.indesign;
    text = indesign.data.toString('utf-8');

    text = handleHtml(text);

    res.set({"Content-Disposition":"attachment; filename=\"clean_up_" + indesign.name + "\""});
    res.send(text);
});

function handleHtml(text){
	text = text.replace(/ class="TEXT-TRANSFORMATION_endnote-superscript"/g,"")
	text = text.replace(/<sup>\s*(\d+)\s*<\/sup>/g,"<sup><a href='#endnote-$1' id='#endnote-sup-$1'>$1</a></sup>")
	return text;
}




app.listen(process.env.PORT || 3000, function () {});