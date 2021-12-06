const { response } = require('express');
var express = require('express');
const { render } = require('../app');
const product_helpers = require('../helpers/product_helpers');
var router = express.Router();
var productHelper = require('../helpers/product_helpers');
const user_helper = require('../helpers/user_helper');
var userHelpers = require('../helpers/user_helper')
const axios = require('axios');

let admindetail = {
  adminName: 'sigi',
  password: '123'

}

const verifyLogin = (req, res, next) => {
  if (req.session.adminLogins) {
    next()
  } else
    res.redirect('/admin')
}



/* GET users listing. */

router.get('/', function (req, res, next) {

  if (req.session.adminLogins) {

    productHelper.countPaymentStatus().then((paymentStatus) => {
      productHelper.totalStatus().then((status) => {
        productHelper.totalBrand().then((brand) => {
          productHelper.totalOrders().then((orders) => {
            productHelper.totalProducts().then((product) => {
              productHelper.totalUsers().then((usersCount) => {
                productHelper.newArrivalsAdmin().then((newProduct) => {
                  productHelper.totalBrandsProducts().then((brands) => {
                    productHelper.StockManage().then((stock) => {

                      var deliveryStatus =
                        [
                          status.totalPlaced,
                          status.totalShipped,
                          status.totalPending,
                          status.totalDelivered,
                          status.totalCancelled
                        ]

                      var allPaymentStatus = [
                        paymentStatus.CODstatus,
                        paymentStatus.RAZORPAYstatus,
                        paymentStatus.PAYPALstatus

                      ]

                      var DifferentBrands = [
                        brands.nike,
                        brands.adidas,
                        brands.puma,
                        brands.bata,
                        brands.converse,
                        brands.cat
                      ]

                      var BrandsStock = [
                        stock.OutofStock,
                        stock.Instock
                      ]

                      res.render('admin/admin_home', { admin: true, adminLogin: true, admindetail: true, newProduct, usersCount, product, orders, brand, deliveryStatus, allPaymentStatus, DifferentBrands, BrandsStock });
                    })
                  })
                })
              })
            })
          })
        })
      })
    })


  } else {
    adminErr = true
    res.redirect('/admin/admin_login')
  }

});


//admin login

router.get('/admin_login', function (req, res) {

  res.render('admin/admin_login', { admin: true })

})

router.post('/admin_login', function (req, res) {

  console.log('checkingggggggggg', admindetail.adminName, req.body.name, admindetail.password, req.body.password);
  if (admindetail.adminName === req.body.name && admindetail.password === req.body.password) {
    req.session.adminLogins = true
    req.session.admin = admindetail
    res.redirect('/admin')
  } else {
    var adminErr = req.session.adminLoginErr = false

    res.redirect('/admin/admin_login')
  }
})



//add product

router.get('/add_product', verifyLogin, async function (req, res) {
  let brand = await productHelper.getBrand()
  productHelper.viewCatagory().then((catagory) => {

    console.log('catagoryrrrrrrrrrrrr', catagory);
    res.render('admin/add_product', { admin: true, adminLogin: true, catagory, brand, admindetail: true })
  })
})



router.post('/add_product', function (req, res) {
  productHelper.addProduct(req.body).then((id) => {
    const image1 = req.files.image1;
    const image2 = req.files.image2;
    const image3 = req.files.image3;
    image1.mv('./public/product_images/' + id + '__1.jpg')
    image2.mv('./public/product_images/' + id + '__2.jpg')
    image3.mv('./public/product_images/' + id + '__3.jpg')
    res.redirect("/admin/view_product")

  });
});



//delete product

router.get('/delete_product/:id', function (req, res) {
  const proId = req.params.id
  productHelper.deleteProduct(proId).then((response) => {
    res.redirect('/admin/view_product')
  })

})


//add coupon

router.get('/add_coupon', verifyLogin, function (req, res) {
  res.render('admin/add_coupon', { admin: true, adminLogin: true, admindetail: true })
})



router.post('/add_coupon', function (req, res) {
  productHelper.addCoupon(req.body).then(() => {
    res.redirect('/admin/add_coupon')

  })

})

//view coupon

router.get('/view_coupon', verifyLogin, function (req, res) {
  productHelper.viewCoupon().then((coupon) => {
    console.log('ccccccccccccccccccccccccc', coupon);
    res.render('admin/view_coupon', { admin: true, adminLogin: true, coupon, admindetail: true })
  })
})


//delete coupon

router.get('/delete_coupon/:id', function (req, res) {
  let cpnId = req.params.id

  productHelper.deleteCoupon(cpnId).then(() => {
    res.redirect('/admin/view_coupon')

  })

})




//catagory

router.get('/catagory/:id', function (req, res) {
  const catId = req.params.id
  productHelper.deleteCatagory(catId).then((response) => {
    res.redirect('/admin/view_catagory')
  })
})


//edit product

router.get('/edit_product/:id', verifyLogin, (req, res) => {
  productHelper.viewCatagory().then(async (catagory) => {
    let product = await productHelper.getProductDetails(req.params.id)
    let brand = await productHelper.getBrand()

    res.render('admin/edit_product', { admin: true, product, adminLogin: true, admindetail: true, catagory, brand })
  })
})



router.post('/edit_product/:id', function (req, res) {

  let id = req.params.id
  productHelper.updateProduct(req.params.id, req.body).then(() => {

    if (req.files) {

      if (req.files.image1) {
        const image1 = req.files.image1;
        image1.mv('./public/product_images/' + id + '__1.jpg')
      }
      if (req.files.image2) {
        const image2 = req.files.image2;
        image2.mv('./public/product_images/' + id + '__2.jpg')

      }
      if (req.files.image3) {
        const image3 = req.files.image3;
        image3.mv('./public/product_images/' + id + '__3.jpg')
      }

    }
    res.redirect('/admin/view_product')
  })
})



//view product

router.get('/view_product', verifyLogin, function (req, res) {
  productHelper.getAllProducts().then((product) => {

    res.render('admin/view_product', { admin: true, product, adminLogin: true, admindetail: true })
  })
})


//view user

router.get('/view_user', verifyLogin, (req, res) => {
  userHelpers.getAllUsers().then((Alluser) => {

    res.render('admin/view_user', { admin: true, adminLogin: true, Alluser, admindetail: true })
  })
})

//block user

router.get('/blockuser/:id', (req, res) => {
  let userId = req.params.id

  userHelpers.blockUser(userId).then((response) => {
    res.redirect('/admin/view_user')
  })
});


//unblock user

router.get('/unblockuser/:id', (req, res) => {

  let userId = req.params.id
  userHelpers.unblockUser(userId).then((response) => {
    res.redirect('/admin/view_user')
  })
});


//order lists

router.get('/order_lists', verifyLogin, async function (req, res) {
  let allorders = await userHelpers.totalOrders()


  res.render('admin/order_list', { admin: true, adminLogin: true, allorders, admindetail: true })

})


router.get('/order_details/:id', verifyLogin, async function (req, res) {
  let orderId = req.params.id

  userHelpers.oderedProduct(orderId).then((orderedproduct) => {
    console.log("product varunnundo nnokatte", orderedproduct);
    userHelpers.oderedProductobject(orderId).then((orderedproduct1) => {
      res.render('admin/order_details', { admin: true, adminLogin: true, orderedproduct, orderId, orderedproduct1, admindetail: true })
    })
  })
})


//change order status

router.get('/change_order_status/', function (req, res) {
  orderId = req.query.orderId

  userHelpers.changeOrderStatus(req.query.orderId, req.query.proId, req.query.status).then((orderId) => {
    req.session.orderId = orderId
    console.log('ooooooooooooooooo', orderId);
    res.redirect('/admin/order_lists')

  }).catch((error) => {
    console.log("error is :", error);
  })
})


//adding catagory

router.get('/add_catagory', verifyLogin, function (req, res) {
  res.render('admin/add_catagory', { admin: true, adminLogin: true, admindetail: true })

})




//view catagory

router.get('/view_catagory', verifyLogin, function (req, res) {

  productHelper.viewCatagory().then((catagory) => {

    res.render('admin/view_catagory', { admin: true, adminLogin: true, catagory, admindetail: true })
  })
})


router.post('/add_catagory', function (req, res) {

  console.log("rthgtrttrttrtrtr", req.body);
  productHelper.addCatagory(req.body).then((result) => {

    console.log(result);

    res.redirect('/admin/view_catagory')

  })

})


// add offer

router.get('/add_offer', verifyLogin, function (req, res) {

  productHelper.viewCatagory().then((catagory) => {
    productHelper.ViewCatagoryOffer().then((catagoryOffer) => {

      res.render('admin/add_offer', { admin: true, adminLogin: true, admindetail: true, catagory, catagoryOffer })
    })
  })

})



router.post('/add_offer', function (req, res) {
  productHelper.addingOffer(req.body).then((AddCatagoryOfferProduct) => {
    
   var offer = parseInt(req.body.offer ) 
    
    
    if (AddCatagoryOfferProduct) {
      AddCatagoryOfferProduct.map((eachProducts) => {
        productHelper.addOfferTotheProduct(eachProducts,offer).then(()=>{
          console.log("Offer added")    
        })
      })   
      productHelper.viewCatagory().then((catagory) => {
        productHelper.ViewCatagoryOffer().then((catagoryOffer) => {
    
          res.render('admin/add_offer', { admin: true, adminLogin: true, admindetail: true, catagory, catagoryOffer })
        })
      })
    }else{   
      res.redirect('/admin/add_offer')    
    }

    

  })
})




//total orders with date

router.get('/total_orders_with_date', verifyLogin, (req, res) => {

  res.render('admin/total_orders_with_date', { admin: true, adminLogin: true, admindetail: true })
})





router.post('/total_orders_with_date', function (req, res) {

  productHelper.dateOrdersList(req.body).then((array) => {
    let newArray = array.filter(function (el) {

      return el.date >= req.body.startdate && el.date <= req.body.enddate
    })

    res.render('admin/total_orders_with_date', { admin: true, adminLogin: true, admindetail: true, newArray })
  })

})



//delete catagory offer     

router.get('/delete_catagory_offer/:id', function (req, res) {
  
  productHelper.deleteCatagoryOffer(req.params.id).then((findProducts) => {
    console.log("the fiind products : ",findProducts)
    findProducts.map((eachproduct) => {
      productHelper.productPriceChange(eachproduct).then(() => {
        
      })
    })
     res.redirect('/admin/add_offer')

  })
})


//delete product offer

router.get('/delete_product_offer/:id', function (req, res) {
  productHelper.deleteProductOffer(req.params.id).then(() => {
    res.redirect('/admin/add_product_offer')

  })

})


//add product offer

router.get('/add_product_offer', verifyLogin, function (req, res) {
  productHelper.getAllProducts().then((productoffer) => {
    productHelper.getTotalproduct().then((productss) => {
      console.log('offfeerrererererer', productss);
      res.render('admin/add_product_offer', { admin: true, adminLogin: true, admindetail: true, productoffer, productss })
    })
  })
})

router.post('/add_product_offer', function (req, res) {
  productHelper.addProductOffer(req.body).then(() => {

    res.redirect('/admin/add_product_offer')

  })
})


//add brand

router.get('/add_brand', verifyLogin, function (req, res) {

  res.render('admin/add_brand', { admin: true, adminLogin: true, admindetail: true })
})

router.post('/add_brand', function (req, res) {

  productHelper.add_brand(req.body).then((brand) => {
    res.redirect('/admin/add_brand')
  })

})


//view brand

router.get('/view_brand', verifyLogin, function (req, res) {
  productHelper.getBrand().then((brand) => {
    res.render('admin/view_brand', { admin: true, adminLogin: true, brand, admindetail: true })

  })

})


//delete brand

router.get('/brand/:id', function (req, res) {
  let brdId = req.params.id
  productHelper.deleteBrand(brdId).then((response) => {
    res.redirect('/admin/view_brand')

  })

})


//view report

router.get('/view_report', verifyLogin, function (req, res) {

  res.render('admin/view_report', { admin: true, adminLogin: true, admindetail: true })
})



router.get('/order_report', verifyLogin, async function (req, res) {

  var allOrder = await productHelper.getAllOrderReport()

  res.render('admin/order_report', { admin: true, adminLogin: true, admindetail: true, allOrder })

})




//outstock report

router.get('/out_of_stock_product', verifyLogin, async function (req, res) {

  var outofstockproducts = await productHelper.outOfStock()
  res.render('admin/out_of_stock_list', { admin: true, adminLogin: true, admindetail: true, outofstockproducts })
})



//add banner

router.get('/add_banner', async function (req, res) {
  var catagory = await productHelper.getCatgory()
  var getAddedBanner = await productHelper.getBannerResult()
  res.render("admin/banner", { admin: true, adminLogin: true, admindetail: true, catagory, getAddedBanner })
})


router.post('/add_banner', async function (req, res) {

  var banner = await productHelper.insertBanner(req.body)
  const image = req.files.image
  image.mv('./public/banner/' + banner + '__1.jpg')

  res.redirect('/admin/add_banner')
})


router.get('/delete_Banner/:id',function(req,res){
  productHelper.deleteBanner(req.params.id)
  res.redirect('/admin/add_banner')
})


//logout

router.get('/logout', function (req, res) {
  req.session.adminLogins = false,


    res.redirect('/admin/admin_login')
})


module.exports = router;
