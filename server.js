//Declare Variables
const express = require("express");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config();
const PORT = 8500;

//add model variable

//Set middleware
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.DB_CONNECTION, { useNewUrlParser: true }, () => {
  console.log("Connected to db!");
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
