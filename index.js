//create a local server using server
var express = require("express");
// var ejs = require("ejs");
var bodyparser = require("body-parser");
// const mongoose = require("mongoose");
var mysql = require("mysql");
var session = require("express-session");
var app = express(); //calling method
app.set("view engine", "ejs"); //this will tell express to set a view engine to ejs
app.listen(8080); //asigning port
app.use(bodyparser.urlencoded({ extended: true })); // code to start using the body parser
app.use(express.static("public")); // this will tell express to use public folder
app.use(session({ secret: "secret" }));
app.get("/", function (req, result) {
  // request and response method
  var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ecommerce_ss",
  });
  conn.query("select * from products", (err, res) => {
    result.render("pages/index", { res: res }); // no need to mention views folder as it is already known by express and write file without extension.
  });
});

function isProductInCart(cart, id) {
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id == id) {
      return true;
    }
  }
  return false;
}
function calculateTotal(cart, req) {
  total = 0;
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].sale_price) {
      total = total + cart[i].sale_price * cart[i].quantity;
    } else {
      total = total + cart[i].price * cart[i].quantity;
    }
  }
  req.session.total = total;
  return total;
}
app.post("/add_to_cart", function (req, res) {
  console.log("Hello");
  var id = req.body.id;
  var name = req.body.name;
  var price = req.body.price;
  var sale_price = req.body.sale_price;
  var quantity = req.body.quantity;
  var image = req.body.image;

  var product = {
    id: id,
    name: name,
    price: price,
    sale_price: sale_price,
    quantity: quantity,
    image: image,
  };

  if (req.session.cart) {
    var cart = req.session.cart;
    if (!isProductInCart(cart, id)) {
      cart.push(product);
    }
  } else {
    req.session.cart = [product];
    var cart = req.session.cart;
  }
  console.log(cart);
  calculateTotal(cart, req);
  //return to cart page
  res.render("pages/cart", { cart: cart });
});

app.get("/cart", function (req, res) {
  var cart = req.session.cart;
  var total = req.session.total;
  res.render("pages/cart", { cart: cart, total: total });
});
app.post("/remove_product", function (req, res) {
  var id = req.body.id;
  var cart = req.session.cart;
  for (let i = 0; i < cart.length; i++) {
    if ((cart[i].id = id)) {
      cart.splice(cart.indexOf(i), 1);
    }
  }
  calculateTotal(cart, req);
  res.redirect("/cart");
});
app.post("/edit_product_quantity", function (req, res) {
  var id = req.body.id;
  var quantity = req.body.quantity;
  var inc = req.body.increase_product_quantity_btn;
  var dec = req.body.decrease_product_quantity_btn;
  var cart = req.session.cart;
  if (inc) {
    for (let i = 0; i < cart.length; i++) {
      if (cart[i].id == id) {
        if (cart[i].quantity > 0) {
          cart[i].quantity = parseInt(cart[i].quantity) + 1;
        }
      }
    }
  }
  if (dec) {
    for (let i = 0; i < cart.length; i++) {
      if (cart[i].id == id) {
        if (cart[i].quantity > 1) {
          cart[i].quantity = parseInt(cart[i].quantity) - 1;
        }
      }
    }
  }
  calculateTotal(cart, req);
  res.redirect("/cart");
});

app.get("/checkout", function (req, res) {
  var total = req.session.total;
  res.render("pages/checkout", { total: total });
});
app.post("/place_order", function (req, res) {
  var name = req.body.name;
  var email = req.body.email;
  var phone = req.body.phone;
  var city = req.body.city;
  var address = req.body.address;
  var cost = req.session.total;
  var status = "not paid";
  var date = new Date();
  var products_ids = "";
  var id = Date.now();
  req.session.order_id = id;

  var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ecommerce_ss",
  });
  var cart = req.session.cart;
  for (let i = 0; i < cart.length ; i++) {
    products_ids = products_ids + "," + cart[i].id;
  }
  conn.connect((err) => {
    if (err) {
      console.log(err);
    } else {
      var query =
        "INSERT INTO orders(id,cost,name,email,status,city,address,phone,date,products_ids) VALUES ?";
      var values = [
        [
          id,
          cost,
          name,
          email,
          status,
          city,
          address,
          phone,
          date,
          products_ids,
        ],
      ];
      conn.query(query, [values], (err, rersult) => {
        for (let i = 0; i < cart.length; i++) {
          var query =
            "INSERT INTO order_items (order_id,product_id,product_name,product_price,product_image,product_quantity,order_date) VALUES ?";
          var values = [
            [
              id,
              cart[i].id,
              cart[i].name,
              cart[i].price,
              cart[i].image,
              cart[i].quantity,
              new Date(),
            ],
          ];
          conn.query(query, [values, (err, result) => {}]);
        }
        res.redirect("/payment");
      });
    }
  });
});
app.get("/payment", function (req, res) {
  var total = req.session.total;
  res.render("pages/payment", { total: total });
});
app.get("/verify_payment", function (req, res) {
  var transaction_id = req.query.transaction_id;
  var order_id = req.session.order_id;
  var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ecommerce_ss",
  });
  conn.connect((err) => {
    if (err) {
      console.log(err);
    } else {
      var query = "INSERT INTO payments(order_id,transaction_id,date) VALUES ?";
      var values = [[order_id, transaction_id, new Date()]];
      conn.query(query, [values], (err, result) => {
        conn.query(
          "UPDATE orders SET status='paid' WHERE id='" + order_id + "'",
          (err, result) => {}
        );
        res.redirect("/thank_you");
      });
    }
  });
});
app.get("/thank_you", function (req, res) {
  var order_id = req.session.order_id;
  res.render("pages/thank_you", { order_id: order_id });
});

app.get('/single_product',function(req,res){
  var id = req.query.id;
  var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ecommerce_ss",
  });
  conn.query("select * from products WHERE id='"+id+"'", (err, res) => {
    result.render("pages/single_product", { res: res }); // no need to mention views folder as it is already known by express and write file without extension.
  });
});
app.get('/products',function(req,res){
  var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "ecommerce_ss",
  });
  conn.query("select * from products", (err, res) => {
    result.render("pages/products", { res: res }); // no need to mention views folder as it is already known by express and write file without extension.
  });
});
app.get('/about',function(req,res){
  res.render('pages/about');
});
