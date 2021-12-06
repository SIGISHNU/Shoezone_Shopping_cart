var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { USER_COLLECTION } = require('../config/collection')
var objectId = require('mongodb').ObjectId;
const { response } = require('express');
const { log } = require('npmlog');
const Lookups = require('twilio/lib/rest/Lookups');
const Razorpay = require('razorpay');
const { readSync } = require('fs');
const { resolve } = require('path');
const { ReturnDocument } = require('mongodb');
const { resolveObjectURL } = require('buffer');
const axios = require('axios');
var paypal = require('paypal-rest-sdk');
const e = require('express');
const { brotliDecompress } = require('zlib');
const { AwsInstance } = require('twilio/lib/rest/accounts/v1/credential/aws');
var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ACCESS_KEY = process.env.PAYPAL_ACCESS_KEY

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': process.env.PAYPAL_CLIENT_ID,
    'client_secret': process.env.PAYPAL_SECRET
});

module.exports = {
    doSignup: (userData) => {
        console.log('userData.........', userData);
        return new Promise(async (resolve, reject) => {
            let checkNumber = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userData.mobile })
            console.log('checkNumber..................', checkNumber);
            if (checkNumber == null) {
                console.log('ttttttt', checkNumber);
                userData.password = await bcrypt.hash(userData.password, 10)
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                    resolve(data)

                })
            } else {
                console.log('uuuuuuuu');
                resolve(false)
            }


        })
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ name: userData.name })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        response.user = user
                        response.status = true
                        console.log("login success");
                        resolve(response)

                    } else {
                        console.log("login failed");
                        resolve({ status: false })
                    }

                })

            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },



    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },

    blockUser: (userId) => {
        return new Promise(async (resolve, reject) => {
            let block = await db.get().collection(collection.USER_COLLECTION).update({ _id: objectId(userId) }, { $set: { block: "false" } })
            console.log('block : ', block)
            resolve(block)

        });
    },
    unblockUser: (userId) => {
        return new Promise(async (resolve, reject) => {
            let unblock = await db.get().collection(collection.USER_COLLECTION).update({ _id: objectId(userId) }, { $set: { block: "true" } })
            console.log('unblock : ', unblock)
            resolve(unblock)

        });
    },




    // productDetails:(proId,)=>{
    //     return new Promise((resolve,reject)=>{
    //         db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
    //             resolve(product)
    //         })
    //     })
    // },



    addToCart: (proId, userId, Price) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1,
            Price: parseInt(Price),
            totalprice: parseInt(Price),
            status: "Pending"
        }

        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })

            if (userCart) {
                let proExist = userCart.product.findIndex(product => product.item == proId)
                console.log(proExist);
                if (proExist != -1) {

                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId), 'product.item': objectId(proId) },
                        {
                            $inc: { 'product.$.quantity': 1 }
                        }
                    ).then(() => {
                        resolve()
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) },
                        {

                            $push: { product: proObj }

                        }


                    ).then((response) => {
                        resolve()

                    })

                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    product: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    console.log('hdiuahffq=', response);
                    resolve(response)
                })
            }
        })
    },

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity',
                        Price: '$product.Price',
                        totalprice: '$product.totalprice'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, Price: 1, totalprice: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }


            ]).toArray()
            console.log('its working=', cartItems);

            if (cartItems[0]) {
                for (key in cartItems) {
                    product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(cartItems[key].item) })
                    db.get().collection(collection.CART_COLLECTION).updateOne({ product: { $elemMatch: { item: objectId(product._id) } } }, {
                        $set: {
                            'product.$.Price': product.Price,
                            'product.$.totalprice': cartItems[key].quantity * product.Price
                        }
                    }).then(() => {
                        resolve(cartItems)
                    })
                }

            } else {
                resolve(false);
            }
        })

    },



    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.product.length
            }
            resolve(count)
        })
    },

    changeProductQuantity: (details) => {

        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        details.Price = parseInt(details.Price)
        console.log(details.Price);


        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { product: { item: objectId(details.product) } }
                    }).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else if (details.count == -1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'product.item': objectId(details.product) },
                    {
                        $inc: { 'product.$.quantity': details.count, 'product.$.totalprice': details.Price * -1 }
                    }

                ).then((response) => {
                    resolve(true)
                })
            }
            else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'product.item': objectId(details.product) },
                    {
                        $inc: { 'product.$.quantity': details.count, 'product.$.totalprice': details.Price }
                    }

                ).then((response) => {
                    resolve(true)
                })
            }

        })
    },

    removeOneProduct: (deletedetails) => {
        console.log('hbajshbacak', deletedetails)

        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(deletedetails.cart) },
                {
                    $pull: { product: { item: objectId(deletedetails.product) } }

                }).then((response) => {
                    resolve({ response })


                })

        })
    },
    getTotalAmount: (userId) => {

        return new Promise(async (resolve, reject) => {
            let subtotal = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity',
                        totalprice: '$product.totalprice',



                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, totalprice: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
                ,
                {
                    $group: {
                        _id: null,
                        subtotal: { $sum: '$totalprice' }
                    }
                }

            ]).toArray()
            console.log(subtotal);
            if (subtotal.length != 0) {
                resolve(subtotal[0].subtotal)
            }
            else {
                resolve(false)
            }
        })

    },




    placeOrder: (order, product, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, product, total);
            let status = order.paymentmethod === 'COD' ? 'Placed' : 'Pending'
            let orderObj = {
                delivaryDetails: {
                    name: order.name,
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                coupon: order.coupon,
                userId: objectId(order.userId),
                paymentMethod: order.paymentmethod,
                product: product,
                totalAmount: total,
                status: status,
                date: new Date().toISOString().slice(0, 10),
                mode: "cart"

            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
                resolve(response.insertedId)
            })


        })

    },



    checkCoupon: (couponCode, totalPrice, userId) => {
        console.log('llllllllllllllll', couponCode);
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).findOne({ coupon: couponCode })
            console.log('rrrrrrrrrrrrrrrrr', coupon);
            if (coupon) {
                let checkedCoupon = await db.get().collection(collection.ORDER_COLLECTION).findOne({ userId: objectId(userId), coupon: coupon.coupon })
                console.log('ccccccccccccccc', checkedCoupon);
                if (checkedCoupon == null) {
                    console.log("sigishnu");
                    var couponSuccess = {}
                    couponSuccess.reductionPrice = (totalPrice * coupon.percentage) / 100
                    couponSuccess.salePrice = totalPrice - ((totalPrice * coupon.percentage) / 100)
                    resolve(couponSuccess)

                } else {

                    let userUsedCoupon = {}
                    userUsedCoupon.userCoupon = "true"
                    resolve(userUsedCoupon)
                    console.log('SIGISHNU.E', userUsedCoupon);
                }
            } else {
                let validCoupon = {}
                validCoupon.invalidCoupon = "true"
                resolve(validCoupon)
            }
        })
    },



    buyNowPlaceOrder: (order, product, Price) => {
        return new Promise((resolve, reject) => {
            console.log(order, product);
            let status = order.paymentmethod === 'COD' ? 'Placed' : 'Pending'
            let orderObj = {
                delivaryDetails: {
                    name: order.name,
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                coupon: order.coupon,
                userId: objectId(order.userId),
                paymentMethod: order.paymentmethod,
                proId: product._id,
                quantity: 1,
                Price: Price,
                description: product.description,
                name: product.name,
                status: status,
                date: new Date().toISOString().slice(0, 10),
                mode: "buyNow"

            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                // db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
                resolve(response.insertedId)
            })


        })

    },


    getAddress: (address, userId) => {

        return new Promise((resolve, reject) => {
            // var newAddress = {}
            // newAddress.userId = userId
            // newAddress.address = address
            address.userId = userId
            db.get().collection(collection.ADDRESS_COLLECTION).insertOne(address).then(() => {
                resolve()
            })

        })

    },

    getAddressInProfile: (userId) => {
        
        return new Promise(async (resolve, reject) => {
            let profileAddress = await db.get().collection(collection.ADDRESS_COLLECTION).find({userId:userId}).toArray()
            resolve(profileAddress)
            console.log('ttttttttttttttttttttttttttttttt', profileAddress);
        })
    },


    deleteAddress: (addId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADDRESS_COLLECTION).deleteOne({ _id: objectId(addId) }).then((response) => {
                resolve(response)
            })

        })

    },


    EditedUser: (userEdit, userId) => {
        return new Promise(async (resolve, reject) => {
            let EditedUser = await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { email: userEdit.email, mobile: userEdit.mobile } })
            resolve(EditedUser)

        })

    },



    getUpdatedUserDetails: (userId) => {
        console.log('useriiiiiiiiiiiiiiiiiiiiiiiidddddddddddd', userId)
        return new Promise(async (resolve, reject) => {
            let userEditDetails = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
            console.log('dddddddddddddddddddddddddddddddddddddddddddddd', userEditDetails)
            resolve(userEditDetails)


        })
    },




    


    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.product)
        })
    },

    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId);
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray()

            resolve(orders)
        })

    },
    getorder: (orderId) => {
        return new Promise(async (resolve, reject) => {
            console.log(orderId);

            let ordersdetail = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })

            resolve(ordersdetail)
        })

    },




    changeOrderStatus: (orderId, proId, statusUpdate) => {
        console.log('rrrrrrrrrrrrr', orderId, proId, statusUpdate)
        return new Promise(async (resolve, reject) => {
            let findOrder = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
            console.log('finding.............', findOrder);
            if (findOrder.mode == 'cart') {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId), product: { $elemMatch: { item: objectId(proId) } } },
                    {
                        $set: {
                            'product.$.status': statusUpdate
                        }
                    }).then(() => {
                        resolve(orderId)
                    })

            } else {

                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                    $set: {
                        status: statusUpdate

                    }
                }).then(() => {
                    resolve(orderId)
                    console.log('finding...........', orderId);
                })
            }
        })
    },




    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let ordersItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$product'
                },
                {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }


            ]).toArray()
            console.log('gggggggggggggggg', ordersItems)
            resolve(ordersItems)

        })
    },


    buyNowoders: (proId) => {
        return new Promise(async (resolve, reject) => {

            let buynow_order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(proId) })
            resolve(buynow_order)
            console.log("buynowwwwwwwwwwww", buynow_order);

        })

    },



    razorpay: (orderId, subtotal) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: subtotal * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "order" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Order:', order);
                    resolve(order)
                }
            });


        })
    },

    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            let crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'ZFiCwi4p5g4lkSJtfFeuLbOr')

            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {

                resolve()

            } else {

                reject()
            }

        })
    },


    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'placed'
                    }
                }
            ).then(() => {
                resolve()

            })

        })
    },


    totalOrders: () => {
        return new Promise(async(resolve, reject) => {
            let allorders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(allorders)
        })

    },



    buyNow: (proId) => {

        return new Promise(async (resolve, reject) => {
            let buyNowproduct = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) })
            resolve(buyNowproduct)
        })
    },



    changePassword: (userData, oldData) => {
        return new Promise(async (resolve, reject) => {

            userData.password = await bcrypt.hash(userData.password, 10);
            var dataUpdated = await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(oldData._id) }, { $set: { password: userData.password } });
            resolve(dataUpdated)

        });
    },



    oderedProduct: (orderId) => {

        return new Promise(async (resolve, reject) => {
            let orderedproduct = await db.get().collection(collection.ORDER_COLLECTION).find({ _id: objectId(orderId) }).toArray()
            resolve(orderedproduct)
        })

    },


    oderedProductobject: (orderId) => {

        return new Promise(async (resolve, reject) => {
            let orderedproduct1 = await db.get().collection(collection.ORDER_COLLECTION).find({ _id: objectId(orderId) }).toArray()
            resolve(orderedproduct1[0])
        })

    },


    buyNowSTockManegement: (proId) => {

        return new Promise(async (resolve, reject) => {
            let buyNowStock = await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, { $inc: { quantity: -1 } })
            resolve(buyNowStock)
            
        })
    },

    wishlistFunction: (proId,userId) => {
        console.log('ide.......'.proId,userId);
        return new Promise(async (resolve, reject) => {

            let favourite = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) })
            console.log('fav................',favourite);
            var wishlist={}
            wishlist.userId = userId
            wishlist.favourite = favourite
            console.log('wishlist..........',wishlist);
            let AddfavProduct = await db.get().collection(collection.WISHLIST_COLLECTION).insertOne(wishlist)
            resolve()

        })

    },


    getwishlistProduct: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION).find({userId:userId}).toArray()
            resolve(wishlist)
        })
    },


    deleteWishProduct: (wshId) => {
        return new Promise(async (resolve, reject) => {
            let deleteProduct = await db.get().collection(collection.WISHLIST_COLLECTION).deleteOne({ _id: objectId(wshId) })
            resolve(deleteProduct)
        })
    },


    searchProduct: (searchText) => {
        return new Promise(async (resolve, reject) => {

            let searchResult = await db.get().collection(collection.PRODUCT_COLLECTION).find({ name: { $regex: searchText, $options: "$i" } }).toArray()
            resolve(searchResult)
            console.log('searchResult..........', searchResult);
        })
    },


    ExpireOffer: () => {
        return new Promise(async (resolve, reject) => {

            var dd = new Date().toISOString().slice(0, 10)
            console.log('dddddddddddddddddddddddd........', dd);

            var findDate = await db.get().collection(collection.CATAGORY_OFFER_COLLECTION).find({ date: { $lte: dd } }).toArray()

            resolve(findDate)


        })
    },


    convertAmount: (amount) => {
        return new Promise(async (resolve, reject) => {
            amount = parseInt(amount)
            axios.get(`http://apilayer.net/api/live?access_key=${ACCESS_KEY}&currencies=INR`).then(response => {
                amount = amount / response.data.quotes.USDINR
                resolve(amount)
            })
        })
    },


    generatePaypal: (orderId, totalPrice) => {
        totalPrice = parseFloat(totalPrice).toFixed(2)
        return new Promise(async (resolve, reject) => {
            var create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": 'http://localhost:8000/test',
                    "cancel_url": "http://cancel.url"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": orderId,
                            "sku": "item",
                            "price": totalPrice,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": totalPrice,
                    },
                    "description": "The Payement success"
                }]
            };
            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    console.log('🦈🦈🦈🦈🦈 The error in payement : ', error.response.details)
                    reject(false);
                } else {
                    console.log('🦠🦠🦠🦠🦠🦠🦠 : ', payment.transactions[0].item_list.items[0]);
                    resolve(true)
                }
            });
        })
    },


    checkPassWord: (mobNum) => {
        return new Promise(async (resolve, reject) => {
            var checkMobNumUser = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: mobNum.mobile })
            console.log('checkMobNumUser.............', checkMobNumUser);
            resolve(checkMobNumUser)


        })
    },

    forgotPasswordChanging: (userPassworddetails) => {

        return new Promise(async (resolve, reject) => {
            userPassworddetails.password1 = await bcrypt.hash(userPassworddetails.password1, 10)
            let changePassword = await db.get().collection(collection.USER_COLLECTION).updateOne({ mobile: userPassworddetails.mobile }, {
                $set: {
                    password: userPassworddetails.password1,
                }

            })

            resolve(changePassword)
        })
    },




    checkMobileNumForLogin: (userDatas) => {
        return new Promise(async (resolve, reject) => {
            let mobileCheckForLogin = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userDatas.mobile })
            resolve(mobileCheckForLogin)
            console.log('mobileCheckForLogin...////....////....', mobileCheckForLogin);
        })
    },



    findSessionUser: (userDatamobile) => {

        return new Promise(async (resolve, reject) => {
            var findSessionUser = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userDatamobile })
            resolve(findSessionUser)
        })
    },




    deleteOrder: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let deleteOrders = await db.get().collection(collection.ORDER_COLLECTION).deleteOne({ _id: objectId(orderId) })
            resolve(deleteOrders)
        })
    },

    getBanner: () => {
        
        return new Promise(async (resolve, reject) => {
            var getBanners = await db.get().collection(collection.BANNER_COLLECTION).find().toArray()
            console.log('getBanners................', getBanners);
            resolve(getBanners)
               
        })
    }     


}

  