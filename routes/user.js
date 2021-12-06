var express = require('express');
const session = require('express-session');
const { Admin } = require('mongodb');
const { response, render } = require('../app');
const user_helper = require('../helpers/user_helper');
var router = express.Router();
var userHelpers = require('../helpers/user_helper')
var productHelper = require('../helpers/product_helpers')
const config = require('../config/config');
const { SigningKeyContext } = require('twilio/lib/rest/api/v2010/account/signingKey');
const { json } = require('express');
const axios = require('axios');
const product_helpers = require('../helpers/product_helpers');
const { Enqueue } = require('twilio/lib/twiml/VoiceResponse');
const client = require("twilio")(config.accountSID, config.authToken)
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else
    res.redirect('/login')
}



/* GET home page. */

router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null
  var banner = await userHelpers.getBanner()
  if (req.session.loggedIn) {
    let result = await userHelpers.ExpireOffer()
    result.map((findDetails) => {
      productHelper.deleteCatagoryOffer(findDetails._id, findDetails.catagory).then((findProducts) => {
        findProducts.map((productDetails) => {
          productHelper.productPriceChange(productDetails).then(() => {

          })
        })

      })

    })
    
    
    var productOfferDate = await product_helpers.getProductDate()
    productOfferDate.map((productOfferDetails) => {
      productHelper.deleteProductOffer(productOfferDetails._id).then(() => {


      })
    })


    let product = await userHelpers.getCartProducts(req.session.user._id)
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    productHelper.newArrivals().then((newProduct) => {
      user = true
      userLogin = true
      userloggedIn = true
      userHeader = true
      res.render('user_home', { newProduct, user, userLogin, userloggedIn, cartCount, product, userHeader, user: req.session.user , banner });


    })
  } else {

    productHelper.newArrivals().then(async (newProduct) => {
      console.log(newProduct)
      user = true
      userLogin = true
      let logginErr = true
      let result = await userHelpers.ExpireOffer()
      result.map((findDetails) => {
        productHelper.deleteCatagoryOffer(findDetails._id).then((findProducts) => {
          findProducts.map((productDetails) => {
            productHelper.productPriceChange(productDetails).then(() => {

            })
          })

        })

      })

      var productOfferDate = await product_helpers.getProductDate()
      productOfferDate.map((productOfferDetails) => {
        productHelper.deleteProductOffer(productOfferDetails._id).then(() => {


        })
      })

      res.render('user_home', { user, newProduct, userLogin, logginErr, banner });

    })

  }
});




//signup

router.get('/signup', function (req, res) {
  user = true
  res.render('user_signup', { user, mobilenumErr: req.session.mobilenumErr })
  req.session.mobilenumErr = false
});

router.post('/signup', function (req, res) {

  req.session.mobile = req.body.mobile
  var mobile = req.body.mobile
  userHelpers.doSignup(req.body).then((response) => {
    if (response) {
      client.verify.services(config.serviceID)
        .verifications
        .create({ to: '+91' + mobile, channel: 'sms' })
        .then(verification => {
          console.log(verification.status)

          console.log(req.body);

          res.render('otp', { user: true, mobile })

        });
    } else {
      req.session.mobilenumErr = true
      res.redirect('/signup')
    }
  });
});


router.post('/siginup_Otp_Verify', function (req, res) {

  mobilenum = req.session.mobile

  mobile = parseInt(mobilenum)
  console.log('Mobile 2 ', mobile);

  client.verify.services(config.serviceID)
    .verificationChecks
    .create({ to: '+91' + mobile, code: req.body.otp })
    .then((verification_check) => {
      console.log(verification_check.status)
      if (verification_check.status == 'approved') {

        res.redirect('/login')

      } else {
        req.session.signupErr = true
        res.render('otp', { user: true, mobile, signupErr: req.session.signupErr })
        req.session.signupErr = false
      }
    })

})



router.get('/resend_OTP_signup_with_OTP', function (req, res) {

  mobilenum = req.session.mobile

  mobile = parseInt(mobilenum)
  client.verify.services(config.serviceID)
    .verifications
    .create({ to: '+91' + mobile, channel: 'sms' })
    .then((verification) => {
      console.log("VErification : ", verification);
      res.render('otp', { user: true })
    })

})




//login

router.get('/login/', function (req, res) {

  var token = req.query.token
  if (token == 'guestToAddToCart') {

    req.session.guestToAddToCart = true,
      req.session.guestToAddToCartproId = req.query.id,
      req.session.guestToAddToCartPrice = req.query.Price
  } else if (token == 'guestToBuyNow') {
    req.session.guestToBuyNow = true,
      req.session.guestToBuyNowproId = req.query.proId


  }
  if (req.session.loggedIn) {


    res.redirect('/')

  } else {

    user = true
    res.render('user_login', { logginErr: req.session.logginErr, user, blockedUser: req.session.blockUser })
    req.session.blockUser = false
    req.session.logginErr = false
  }

});


router.post('/login', function (req, res) {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true
      req.session.user = response.user
      if (req.session.user.block == 'true') {

        if (req.session.guestToAddToCart) {
          res.redirect('/add_cart/' + req.session.guestToAddToCartproId + '/' + req.session.guestToAddToCartPrice)
        } else if (req.session.guestToBuyNow) {
          res.redirect('/buy_now/' + req.session.guestToBuyNowproId)
        }


        res.redirect('/login')

      } else {
        req.session.user.block == 'false'
        req.session.blockUser = true
        res.redirect('/login')
      }
    } else {
      req.session.logginErr = true
      res.redirect('/login')
    }

  })

})

router.post('/signinmobile', (req, res) => {
  console.log(req.body);
  mobile = parseInt(req.body.mobile)
  console.log("The mobile is  : ", mobile);
  client.verify.services(config.serviceID)
    .verifications
    .create({ to: '+91' + mobile, channel: 'sms' })
    .then((verification) => {
      console.log("VErification : ", verification);
      res.render('otp', { user: true, mobile })
    });
})

router.post('/otpverify', (req, res) => {
  console.log('The req.body is : ', req.body)
  mobile = parseInt(req.body.mobile)
  console.log('Mobile 2 ', mobile);

  client.verify.services(config.serviceID)
    .verificationChecks
    .create({ to: '+91' + mobile, code: req.body.otp })
    .then((verification_check) => {
      console.log(verification_check.status)
      res.redirect("/login")

    })
})




//singleview

router.get('/single_view/:id', verifyLogin, async (req, res) => {
  let product = await productHelper.getProductDetails(req.params.id)
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  userLogin = true
  user = true
  userHeader = true

  res.render('single_view', { product, userHeader, userLogin, user, user: req.session.user, cartCount, userloggedIn: true })

})


//cart

router.get('/cart', verifyLogin, async function (req, res) {
  userHeader = true
  user = true
  userLogin = true

  let product = await userHelpers.getCartProducts(req.session.user._id)
  let subtotal = await userHelpers.getTotalAmount(req.session.user._id,)
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  if (product) {

    res.render('cart', { user, userHeader, userLogin, product, user: req.session.user, subtotal, cartCount, userloggedIn: true })
  } else {

    res.render('cart', { user, userLogin, user: req.session.user, cart: true, userloggedIn: true })
  }
})



//add cart

router.get('/add_cart/:id/:Price', (req, res) => {
  console.log("Cart  :", req.params.id, req.params.Price);
  console.log('API calling');
  if (req.session.guestToAddToCart) {
    console.log('guestToAddToCart');
    req.session.guestToAddToCart = false,
      userHelpers.addToCart(req.params.id, req.session.user._id, req.params.Price).then(() => {
        res.redirect('/cart')

      })
  } else {
    userHelpers.addToCart(req.params.id, req.session.user._id, req.params.Price).then(() => {
      console.log('main add to cart');
      res.json({ status: true })
    })
  }

})


router.post('/change_quantity', (req, res, next) => {
  console.log('asdafnakhfinwvuvwk');
  userHelpers.changeProductQuantity(req.body).then((response) => {

    res.json(response)

  })
})






//cart placeorder

router.get('/place_order', verifyLogin, async function (req, res) {

  let subtotal = await userHelpers.getTotalAmount(req.session.user._id,)
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  let address1 = await userHelpers.getAddressInProfile(req.session.user._id)
  console.log('addressssssssssssss:', address1);
  res.render('checkout', { user: true, userLogin: true, userHeader: true, subtotal, address1, user: req.session.user, cartCount, userloggedIn: true })

})


router.post('/place_order', async function (req, res) {

  let totalPrice = req.body.lastPrice
  let product = await userHelpers.getCartProductList(req.body.userId)
  // let subtotal = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, product, totalPrice).then((orderId) => {
    if (req.body.paymentmethod === 'COD') {
      res.json({ codSuccess: true })

    } else if (req.body.paymentmethod === 'RAZOR PAY') {
      userHelpers.razorpay(orderId, totalPrice).then((response => {
        res.json(response)
      }))

    } else {
      userHelpers.generatePaypal(orderId, totalPrice).then((paySuccess) => {

        res.json(paySuccess)

      }).catch((err) => {
        res.redirect('/404')
      })
    }



    product.map((datas) => {
      productHelper.quantityChange(datas).then(() => {

      })

    })

  })

})


router.post('/remove_product', function (req, res) {
  userHelpers.removeOneProduct(req.body).then((response) => {
    if (response) {
      res.json(response)
    }
  })

})




//payment successful

router.get('/successful', verifyLogin, async function (req, res) {

  res.render('successful', { user: true, user: req.session.user })
})






//buynow placeorder

router.post('/buynow_place_order', async function (req, res) {

  let totalPrice = req.body.lastPrice
  let product = await userHelpers.buyNow(req.body.proId)
  let cartCount = await userHelpers.getCartCount(req.session.user._id)
  console.log("PPPPPRRRRIIIICCCEEEE", totalPrice);
  console.log("body", req.body);
  userHelpers.buyNowPlaceOrder(req.body, product, totalPrice).then((orderId) => {
    if (req.body.paymentmethod === 'COD') {
      res.json({ codSuccess: true })

    } else if (req.body.paymentmethod === 'RAZOR PAY') {
      userHelpers.razorpay(orderId, totalPrice).then((response => {
        res.json(response)
      }))

    } else {
      userHelpers.generatePaypal(orderId, totalPrice).then((paySuccess) => {

        res.json(paySuccess)

      }).catch((err) => {
        res.redirect('/404')
      })

    }

    userHelpers.buyNowSTockManegement(req.body.proId).then(() => {

    })
  })
})



router.post('/verify_payment', function (req, res) {
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['receipt']).then(() => {
      console.log('payment successful');
      res.json({ status: true })
    })

  }).catch((err) => {
    console.log(err);
    res.json({ status: false, errMsg: '' })
  })

})

router.post('/currencycoverter/:finalPrice', (req, res) => {

  userHelpers.convertAmount(req.params.finalPrice).then((convertedAmount) => {
    console.log("The converted amount : ", convertedAmount)
    res.json(convertedAmount)
  })
})




//orderlist

router.get('/order_list', verifyLogin, async function (req, res) {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  res.render('order_list', { user: true, user: req.session.user, userHeader: true, userLogin: true, orders, userloggedIn: true })
})


router.get('/view_order_product/:id', verifyLogin, async (req, res) => {

  let orders = await userHelpers.getorder(req.params.id)
  console.log('kkkkkkkkkkk', orders);

  if (orders.mode === "cart") {

    let product = await userHelpers.getOrderProducts(req.params.id)
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    res.render('view_order_product', { user: true, user: req.session.user, product, userHeader: true, userLogin: true, orders, cartCount, cart: true, userloggedIn: true })

  } else if (orders.mode === "buyNow") {
    let buynow_product = await userHelpers.buyNowoders(req.params.id)
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    res.render('view_order_product', { user: true, user: req.session.user, buynow_product, orders, userHeader: true, userLogin: true, cartCount, buy_now: true, userloggedIn: true })

  }
})


//coupon

router.get('/checkCoupon/:coupon/:subtotal', function (req, res) {

  userHelpers.checkCoupon(req.params.coupon, req.params.subtotal, req.session.user._id).then((response) => {
    if (response) {
      res.json(response)
    }
  })

})


//profile

router.get('/profile', verifyLogin, async function (req, res) {
  if (req.session.loggedIn) {
    let userId = req.session.user._id
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    let address = await userHelpers.getAddressInProfile(req.session.user._id)
    let userCurrentAddress = await userHelpers.getUpdatedUserDetails(userId)
    res.render('user_profile', { userLogin: true, userHeader: true, address, userCurrentAddress, userId, user: req.session.user, cartCount, userloggedIn: true })

  }

})


router.post('/profile', async function (req, res) {
  let userId = req.session.user._id

  console.log('WHAT IS COMING :', req.body);
  userHelpers.EditedUser(req.body, userId).then((id) => {
    if (req.files) {
      let image1 = req.files.image1;
      console.log('imageidddddddddddddddd:', id);
      image1.mv('./public/product_images/' + userId + '__1.jpg')
      res.redirect('/profile')
    } else {
      res.redirect('/profile')
    }


  })


})



//buy now button

router.get('/buy_now/:id', verifyLogin, async function (req, res) {
  console.log("params", req.params);

  req.session.guestToBuyNow = false

  userHelpers.buyNow(req.params.id).then(async (product) => {
    console.log('wwwwwwwwwwwww', product);
    var address1 = await userHelpers.getAddressInProfile(req.session.user._id)
    res.render('buy_now_checkout', { user: true, userLogin: true, userHeader: true, address1, user: req.session.user, product, userloggedIn: true })



  })
})



//address

router.get('/add_address', verifyLogin, function (req, res) {


  res.render('add_address', { user: true, userLogin: true, userHeader: true, user: req.session.user })


})

router.post('/add_Address', function (req, res) {
  console.log('hgggggghhghhghhhhhh', req.body);
  let userId = req.session.user._id
  userHelpers.getAddress(req.body,userId).then((response) => {

    res.redirect('/profile')

  })
})



//delete address

router.get('/delete_address/:id', function (req, res) {
  let addId = req.params.id
  userHelpers.deleteAddress(addId).then((response) => {
    res.redirect('/profile')

  })

})


// main search

router.get('/getSearchProducts/:text', function (req, res) {
  var searchProduct = req.params.text
  console.log('text..............', searchProduct);
  userHelpers.searchProduct(searchProduct).then((response) => {
    res.json(response)
    console.log('response...........', response);

  })
})





//forgot passsword


router.get('/forgotpassword', function (req, res) {

  res.render('forgot_mobile', { user: true, mobNumCheckingErr: req.session.mobNumCheckingErr })
  req.session.mobNumCheckingErr = false

})



router.post('/forgotmobile', async (req, res) => {


  var mobNumChecking = await userHelpers.checkPassWord(req.body)


  if (mobNumChecking) {
    req.session.userDetails = mobNumChecking
    let mobilenum = req.session.userDetails.mobile
    mobNumChecking = true;
    console.log(req.body);
    mobile = parseInt(mobilenum)
    console.log("The mobile is  : ", mobile);
    client.verify.services(config.serviceID)
      .verifications
      .create({ to: '+91' + mobile, channel: 'sms' })
      .then((verification) => {
        console.log("VErification : ", verification);
        res.render('forgot_otp', { user: true })
      });


  } else {
    req.session.mobNumCheckingErr = true;
    res.redirect('/forgotpassword')
  }
})


//forgot otp verify

router.post('/forgototpverify', (req, res) => {
  mobNumChecking = req.session.userDetails
  let mobilenum = req.session.userDetails.mobile


  mobile = parseInt(mobilenum)


  client.verify.services(config.serviceID)
    .verificationChecks
    .create({ to: '+91' + mobile, code: req.body.otp })
    .then((verification_check) => {
      console.log(verification_check.status)
      if (verification_check.status == 'approved') {
        res.render("forgot_password", { user: true, mobile })
      } else {
        req.session.otpErr = true,
          res.render('forgot_otp', { user: true, otpErr: req.session.otpErr })

      }



    })

})


//forgot resend otp

router.get('/resend_OTP_forgot_with_OTP', (req, res) => {
  mobNumChecking = req.session.userDetails
  let mobilenum = req.session.userDetails.mobile


  mobile = parseInt(mobilenum)

  client.verify.services(config.serviceID)
    .verifications
    .create({ to: '+91' + mobile, channel: 'sms' })
    .then((verification) => {

      res.render('forgot_otp', { user: true })
    });

})




router.post("/forgotpassword", function (req, res) {

  console.log('forgotmobile;;;;;;;;;;;;;;;;;', req.body);
  userHelpers.forgotPasswordChanging(req.body).then(() => {

    res.redirect('/login')

  })
})




// login with otp


router.get('/login_mobile', function (req, res) {

  res.render('login_mobile', { user: true })
})


router.post('/login_mobile', async (req, res) => {

  var loginMobile = await userHelpers.checkMobileNumForLogin(req.body)

  if (loginMobile) {

    req.session.userDatas = loginMobile
    let mobilenum = req.session.userDatas.mobile

    mobNumCheckinglogin = true;

    mobile = parseInt(mobilenum)
    client.verify.services(config.serviceID)
      .verifications
      .create({ to: '+91' + mobile, channel: 'sms' })
      .then((verification) => {
        console.log("VErification : ", verification);
        res.render('login_otp', { user: true })
      })

  } else {
    var mobileNumberErr = true;
    res.render('login_mobile', { user: true, mobileNumberErr })
  }

})


//login otp verified

router.post('/otpverified', function (req, res) {


  loginMobile = req.session.userDatas
  let mobilenum = req.session.userDatas.mobile

  mobile = parseInt(mobilenum)
  console.log('Mobile 2 ', mobile);

  client.verify.services(config.serviceID)
    .verificationChecks
    .create({ to: '+91' + mobile, code: req.body.otp })
    .then((verification_check) => {
      console.log(verification_check.status)
      if (verification_check.status == 'approved') {
        userHelpers.findSessionUser(req.session.userDatas.mobile).then((response) => {
          if (response.block == 'true') {
            console.log('responseeeee...........', response);
            req.session.user = response
            req.session.loggedIn = true;

            res.redirect('/')
          } else {
            req.session.otpErr2 = true,
              res.render('login_otp', { user: true, otpErr2: req.session.otpErr2 })

          }
        })
      } else {
        req.session.otpErr1 = true,
          res.render('login_otp', { user: true, otpErr1: req.session.otpErr1 })

      }



    })
})




//login resend

router.get('/resend_OTP_Login_with_OTP', function (req, res) {

  loginMobile = req.session.userDatas
  let mobilenum = req.session.userDatas.mobile
  mobNumCheckinglogin = true;

  mobile = parseInt(mobilenum)
  client.verify.services(config.serviceID)
    .verifications
    .create({ to: '+91' + mobile, channel: 'sms' })
    .then((verification) => {
      console.log("VErification : ", verification);
      res.render('login_otp', { user: true })
    })

})




// shop

router.get('/shop', function (req, res) {

  productHelper.allProduct().then(async (shop) => {
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    res.render('product_shop', { user: true, user: req.session.user, userloggedIn: true, userHeader: true, userLogin: true, shop, cartCount })

  })


})




//wishlist 

router.get('/wishlist', verifyLogin, function (req, res) {

  userHelpers.getwishlistProduct(req.session.user._id).then(async (fav) => {
    let cartCount = await userHelpers.getCartCount(req.session.user._id)

    res.render('wishlist', { user: true, user: req.session.user, userHeader: true, userLogin: true, userloggedIn: true, fav, cartCount })

  })

})



//wishlist button

router.post('/wishlist/:id', function (req, res) {

  var proId = req.params.id
  userHelpers.wishlistFunction(proId,req.session.user._id).then((response) => {
    console.log('responseeeeeeeeeeeeeee......',response);
    res.json({ status: true })

  })

})


//wishlist product delete

router.get('/delete_wishlist_product/:id', function (req, res) {
  userHelpers.deleteWishProduct(req.params.id).then(() => {
    res.redirect('/wishlist')
  })
})



//delete order

router.get('/delete_order/:id', function (req, res) {
  userHelpers.deleteOrder(req.params.id).then(() => {
    res.redirect('/order_list')
  })
})



//logout

router.get('/logout', function (req, res) {
  req.session.loggedIn = false;
  req.session.user = false
  res.redirect('/')
})


module.exports = router;
