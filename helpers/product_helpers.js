var collection = require('../config/collection');
var db = require('../config/connection');
const axios = require('axios');
var objectId = require('mongodb').ObjectId;
const { PRODUCT_COLLECTION } = require('../config/collection');

module.exports = {


    //add product

    addProduct: async (product) => {
        console.log(product);
        product.Price = parseInt(product.Price)
        product.quantity = parseInt(product.quantity)
        const data = await db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product);
        return data.insertedId
    },


    //add catgory

    addCatagory: async (catagory) => {
        console.log(catagory);
        const catagorydata = await db.get().collection(collection.CATAGORY_COLLECTION).insertOne(catagory);
        return catagorydata.insertedId
    },


    //view catagory

    viewCatagory: () => {
        return new Promise(async (resolve, reject) => {
            let catagory = await db.get().collection(collection.CATAGORY_COLLECTION).find().toArray()
            resolve(catagory)

        })

    },


    //add catagory offer

    addingOffer: (offer) => {

        offer.offer = parseInt(offer.offer)
        
        return new Promise(async (resolve, reject) => {

            var checkCatagory = await db.get().collection(collection.CATAGORY_OFFER_COLLECTION).findOne({ catagory: offer.catagory })
            
            var AddCatagoryOfferProduct = await db.get().collection(collection.PRODUCT_COLLECTION).find({ catagory: offer.catagory }).toArray()
            
            if (checkCatagory == null ) {
                console.log("The cat == ",AddCatagoryOfferProduct);

                var UpdateCatagoryToProduct = await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ catagory: offer.catagory }, {

                    $set: {
                        offer: offer.offer

                    }
                }).then((result)=>{
                    console.log("The reslut is : ",result);
                })
                // var AddCatagoryOfferProduct = await db.get().collection(collection.PRODUCT_COLLECTION).find({ catagory: offer.catagory }).toArray()
                console.log('checkkkkkkkkkkk....', AddCatagoryOfferProduct);
                AddCatagoryOfferProduct.Price = parseInt(AddCatagoryOfferProduct.Price)
                var addoffer = await db.get().collection(collection.CATAGORY_OFFER_COLLECTION).insertOne(offer)
                console.log("The insert is : ",addoffer)
                resolve(AddCatagoryOfferProduct)
            } else {
                resolve(false)
            }



        })

    },




    addOfferTotheProduct: (datas,offer) => {
        return new Promise(async (resolve, reject) => {

           
     
            var checkAnyOffer= await db.get().collection(collection.PRODUCT_COLLECTION).findOne({name:datas.catagory,offer:{$exists:true}})
            console.log("the each products : ",checkAnyOffer)
            if(checkAnyOffer == null){

                var addingPriceOffer = await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(datas._id) }, {
                    $set: {
                        offer:offer,
                        Oldprice: datas.Price,
                        Price: datas.Price - (datas.Price * offer) / 100
                    }
                })         
                resolve(addingPriceOffer)
                        }



        })

    },



    //add product offer

    addProductOffer: (productOfferDetails) => {

        productOfferDetails.offer = parseInt(productOfferDetails.offer)

        return new Promise(async (resolve, reject) => {
            
            var checkProductOffer = await db.get().collection(collection.PRODUCT_OFFER_COLLECTION).findOne({ product: productOfferDetails.product })
            var checkCatagoryOffer1 = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ name:productOfferDetails.product,offer:{$exists:true}})
            if (checkProductOffer == null && checkCatagoryOffer1 == null) {
               
                var findProduct = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ name: productOfferDetails.product })
                findProduct.Price = parseInt(findProduct.Price)
                var addOffer = await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ name: productOfferDetails.product }, {
                    $set: {
                        offer: productOfferDetails.offer,
                        Oldprice: findProduct.Price,
                        Price: findProduct.Price - (productOfferDetails.offer * findProduct.Price) / 100


                    }

                })



                var insertProductOffer = await db.get().collection(collection.PRODUCT_OFFER_COLLECTION).insertOne(productOfferDetails)
                resolve()
              

            } else {
               
                resolve(false)
            }


        })

    },


    //delete product offer

    deleteProductOffer: (offerId) => {
        return new Promise(async (resolve, reject) => {

            var findOfferProduct = await db.get().collection(collection.PRODUCT_OFFER_COLLECTION).findOne({ _id: objectId(offerId) })
            console.log('findOfferProduct............', findOfferProduct);
            if (findOfferProduct) {
                var findProductToDelete = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ name: findOfferProduct.product })
                console.log('findProductToDelete.......................', findProductToDelete);
                var updateProduct = await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ name: findOfferProduct.product }, {
                    $unset: {
                        offer: 1
                    }

                })
                console.log('updateProduct................................', updateProduct);

                var changePrice = await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ name: findOfferProduct.product }, {
                    $set: {
                        Price: findProductToDelete.Oldprice,

                    }
                })
                console.log("changePrice............................", changePrice);

                var deleteofferProduct = await db.get().collection(collection.PRODUCT_OFFER_COLLECTION).deleteOne({ _id: objectId(offerId) })
                resolve(deleteofferProduct)
            }

        })


    },


    //view catgory offer

    ViewCatagoryOffer: () => {
        return new Promise(async (resolve, reject) => {
            let getcatagoryoffer = await db.get().collection(collection.CATAGORY_OFFER_COLLECTION).find().toArray()
            resolve(getcatagoryoffer)
        })
    },


    //delete catagory offer

    deleteCatagoryOffer: (cfrId) => {
        return new Promise(async (resolve, reject) => {
            var deleteCaragoryOfferedProduct = await db.get().collection(collection.CATAGORY_OFFER_COLLECTION).findOne({ _id:objectId(cfrId) })
           
            if (deleteCaragoryOfferedProduct) {
                var deleteCatagoryOffers = await db.get().collection(collection.CATAGORY_OFFER_COLLECTION).deleteOne({ catagory: deleteCaragoryOfferedProduct.catagory })
                console.log("THe del rslt : ",deleteCatagoryOffers)
                var findProducts = await db.get().collection(collection.PRODUCT_COLLECTION).find({ catagory: deleteCaragoryOfferedProduct.catagory }).toArray()
                var updateProduct = await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ catagory: deleteCaragoryOfferedProduct.catagory }, {
                    $unset: {
                        offer: 1
                    }

                })  
               // var deleteBanners = await db.get().collection(collection.BANNER_COLLECTION).deleteOne({catagory:catagoryname})
               
               resolve(findProducts)
           
            } else {
                resolve(false)
            }


        })

    },



    //offer price changing

    productPriceChange: (product) => {
        return new Promise(async (resolve, reject) => {

            let updateProductPrice = await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(product._id) }, {
                $set: {
                    Price: product.Oldprice
                }

            }).then((rslt)=>{
                console.log("The rslt : ",rslt);
            })


            resolve()
           
        })

    },



    getProductDate: () => {

        var offerDate = new Date().toISOString().slice(0, 10)
        console.log('.....###........###......', offerDate);
        return new Promise(async (resolve, reject) => {
            let getOfferedProducts = await db.get().collection(collection.PRODUCT_OFFER_COLLECTION).find({ date: { $lte: offerDate } }).toArray()
            resolve(getOfferedProducts)
            console.log('productoffer..............', getOfferedProducts);
        })

    },


    dateOrdersList: (orderlist) => {

        return new Promise(async (resolve, reject) => {
            var orderlist = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()

            resolve(orderlist)

        })

    },





    getBrand: () => {
        return new Promise(async (resolve, reject) => {
            let brand = await db.get().collection(collection.BRAND_COLLECTION).find().toArray()
            resolve(brand)
        })
    },

    deleteBrand: (brdId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BRAND_COLLECTION).deleteOne({ _id: objectId(brdId) }).then((response) => {
                resolve(response)
            })
        })
    },

    getAllProducts: () => {

        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(product)

        })
    },
    getTotalproduct: () => {
        return new Promise(async (resolve, reject) => {
            let totalProduct = await db.get().collection(collection.PRODUCT_OFFER_COLLECTION).find().toArray()
            resolve(totalProduct)

        })

    },

    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
                db.get().collection(collection.WISHLIST_COLLECTION).deleteOne({ _id: objectId(proId) }).then((result) => {
                    resolve(response)
                })

            })
        })
    },

    deleteCatagory: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATAGORY_COLLECTION).deleteOne({ _id: objectId(catId) }).then((response1) => {
                resolve(response1)
            })
        })
    },

    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },

    updateProduct: (proId, proDetails) => {
        proDetails.quantity = parseInt(proDetails.quantity)
        proDetails.Price = parseInt(proDetails.Price)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                $set: {
                    name: proDetails.name,
                    brand: proDetails.brand,
                    Price: proDetails.Price,
                    quantity: proDetails.quantity,
                    catagory: proDetails.catagory,
                    description: proDetails.description
                }
            }).then((response) => {
                resolve()
            })
        })
    },

    allProduct: () => {
        return new Promise((resolve, reject) => {
            var newProduct3 = db.get().collection(collection.PRODUCT_COLLECTION).find().sort({ date: -1 }).toArray()
            resolve(newProduct3)
        })
    },


    newArrivals: () => {
        return new Promise((resolve, reject) => {
            var newProduct2 = db.get().collection(collection.PRODUCT_COLLECTION).find().sort({ date: -1 }).limit(8).toArray()
            resolve(newProduct2)
        })

    },
    newArrivalsAdmin: () => {
        return new Promise((resolve, reject) => {
            var newProduct1 = db.get().collection(collection.PRODUCT_COLLECTION).find().sort({ date: -1 }).limit(4).toArray()
            resolve(newProduct1)
        })

    },


    add_brand: async (brand) => {
        console.log(brand);
        var newbrand = await db.get().collection(collection.BRAND_COLLECTION).insertOne(brand)
        return newbrand.insertedId
    },


    addCoupon: async (coupon) => {
        console.log('ccccoooouppppon', coupon);
        var addedCoupon = await db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon)
        return addedCoupon.insertedId
    },


    viewCoupon: () => {
        return new Promise(async (resolve, reject) => {
            var getAddedCoupon = await db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(getAddedCoupon)

        })

    },


    deleteCoupon: (cpnId) => {
        return new Promise((resolve, reject) => {
            var deletedCoupon = db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectId(cpnId) })
            resolve(deletedCoupon)
        })
    },


    getAllOrderReport: () => {
        return new Promise((resolve, reject) => {
            let getAllOrders = db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(getAllOrders)
        })
    },

    totalUsers: () => {
        return new Promise(async (resolve, reject) => {
            let userCount = await db.get().collection(collection.USER_COLLECTION).count()
            resolve(userCount)
            console.log('users', userCount);

        })
    },

    totalProducts: () => {
        return new Promise(async (resolve, reject) => {
            let getTotalProducts = await db.get().collection(collection.PRODUCT_COLLECTION).count()
            resolve(getTotalProducts)
            console.log('product', getTotalProducts);
        })
    },

    totalOrders: () => {
        return new Promise(async (resolve, reject) => {
            let getTotalOrders = await db.get().collection(collection.ORDER_COLLECTION).count()
            resolve(getTotalOrders)
            console.log('Orders', getTotalOrders);
        })
    },

    totalBrand: () => {
        return new Promise(async (resolve, reject) => {
            let getTotalBrand = await db.get().collection(collection.BRAND_COLLECTION).count()
            resolve(getTotalBrand)
            console.log('Brand', getTotalBrand);
        })
    },


    totalStatus: () => {
        return new Promise(async (resolve, reject) => {
            let buynowStatusPlaced = await db.get().collection(collection.ORDER_COLLECTION).count({ mode: "buyNow", status: "Placed" })
            console.log('buynow placed', buynowStatusPlaced);
            let cartStatusPlaced = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { mode: "cart" }
                },
                {
                    $unwind: "$product"

                },
                {
                    $match: { "product.status": "Placed" }
                },
                {
                    $project: {
                        quantity: "$product.quantity"
                    }
                },
                {
                    $group: {
                        _id: null,
                        quantity: { $sum: "$quantity" }
                    }
                }

            ]).toArray()
            console.log('cart placed', cartStatusPlaced)
            if (cartStatusPlaced[0]) {
                var cartPlaced = cartStatusPlaced[0].quantity

            } else {
                var cartPlaced = 0
            }

            let totalPlaced = buynowStatusPlaced + cartPlaced


            // status shipped 

            let buynowStatusShipped = await db.get().collection(collection.ORDER_COLLECTION).count({ mode: "buyNow", status: "Shipped" })
            console.log('buynow Shipped', buynowStatusShipped);
            let cartStatusShipped = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { mode: "cart" }
                },
                {
                    $unwind: "$product"

                },
                {
                    $match: { "product.status": "Shipped" }
                },
                {
                    $project: {
                        quantity: "$product.quantity"
                    }
                },
                {
                    $group: {
                        _id: null,
                        quantity: { $sum: "$quantity" }
                    }
                }

            ]).toArray()
            console.log('cart Shipped', cartStatusShipped)
            if (cartStatusShipped[0]) {
                var cartShipped = cartStatusShipped[0].quantity

            } else {
                var cartShipped = 0
            }

            let totalShipped = buynowStatusShipped + cartShipped




            // status pending



            let buynowStatusPending = await db.get().collection(collection.ORDER_COLLECTION).count({ mode: "buyNow", status: "Pending" })
            console.log('buynow Pending', buynowStatusPending);
            let cartStatusPending = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { mode: "cart" }
                },
                {
                    $unwind: "$product"

                },
                {
                    $match: { "product.status": "Pending" }
                },
                {
                    $project: {
                        quantity: "$product.quantity"
                    }
                },
                {
                    $group: {
                        _id: null,
                        quantity: { $sum: "$quantity" }
                    }
                }

            ]).toArray()
            console.log('cart Pending', cartStatusPending)
            if (cartStatusPending[0]) {
                var cartPending = cartStatusPending[0].quantity

            } else {
                var cartPending = 0
            }

            let totalPending = buynowStatusPending + cartPending



            // status delivered


            let buynowStatusDelivered = await db.get().collection(collection.ORDER_COLLECTION).count({ mode: "buyNow", status: "Delivered" })
            console.log('buynow Delivered', buynowStatusDelivered);
            let cartStatusDelivered = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { mode: "cart" }
                },
                {
                    $unwind: "$product"

                },
                {
                    $match: { "product.status": "Delivered" }
                },
                {
                    $project: {
                        quantity: "$product.quantity"
                    }
                },
                {
                    $group: {
                        _id: null,
                        quantity: { $sum: "$quantity" }
                    }
                }

            ]).toArray()
            console.log('cart Delivered', cartStatusDelivered)
            if (cartStatusDelivered[0]) {
                var cartDelivered = cartStatusDelivered[0].quantity

            } else {
                var cartDelivered = 0
            }

            let totalDelivered = buynowStatusDelivered + cartDelivered



            // status cancelled



            let buynowStatusCancelled = await db.get().collection(collection.ORDER_COLLECTION).count({ mode: "buyNow", status: "Cancelled" })
            console.log('buynow Cancelled', buynowStatusCancelled);
            let cartStatusCancelled = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { mode: "cart" }
                },
                {
                    $unwind: "$product"

                },
                {
                    $match: { "product.status": "Cancelled" }
                },
                {
                    $project: {
                        quantity: "$product.quantity"
                    }
                },
                {
                    $group: {
                        _id: null,
                        quantity: { $sum: "$quantity" }
                    }
                }

            ]).toArray()
            console.log('cart Cancelled', cartStatusCancelled)
            if (cartStatusCancelled[0]) {
                var cartCancelled = cartStatusCancelled[0].quantity

            } else {
                var cartCancelled = 0
            }

            let totalCancelled = buynowStatusCancelled + cartCancelled



            count = {}
            count.totalCancelled = totalCancelled,
                count.totalDelivered = totalDelivered,
                count.totalPending = totalPending,
                count.totalShipped = totalShipped,
                count.totalPlaced = totalPlaced

            resolve(count)
            console.log('all status............:', count);

        })

    },



    countPaymentStatus: () => {
        return new Promise(async (resolve, reject) => {
            let CODstatus = await db.get().collection(collection.ORDER_COLLECTION).count({ paymentMethod: "COD" })
            console.log('CODstatus', CODstatus);
            var RAZORPAYstatus = await db.get().collection(collection.ORDER_COLLECTION).count({ paymentMethod: "RAZOR PAY" })
            console.log('RAZORPAYstatus', RAZORPAYstatus);
            var PAYPALstatus = await db.get().collection(collection.ORDER_COLLECTION).count({ paymentMethod: "PAY PAL" })
            console.log("PAYPALstatus", PAYPALstatus);
            paymentMethodCOunt = {}

            paymentMethodCOunt.CODstatus = CODstatus,
                paymentMethodCOunt.RAZORPAYstatus = RAZORPAYstatus,
                paymentMethodCOunt.PAYPALstatus = PAYPALstatus

            resolve(paymentMethodCOunt)
            console.log('paymentMethodCOunt', paymentMethodCOunt);



        })
    },



    quantityChange: (datas) => {
        return new Promise(async (resolve, reject) => {

            let cartQuantityChanging = await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(datas.item) }, { $inc: { quantity: -datas.quantity } })
            resolve(cartQuantityChanging)
            console.log('cart quantity .................', cartQuantityChanging);

        })

    },


    outOfStock: () => {
        return new Promise(async (resolve, reject) => {
            var findOutofStockProduct = await db.get().collection(collection.PRODUCT_COLLECTION).find({ quantity: 0 }).toArray()
            resolve(findOutofStockProduct)
            console.log('OUTOFSTOCKPRODUCTS..................', findOutofStockProduct);
        })
    },




    totalBrandsProducts: () => {
        return new Promise(async (resolve, reject) => {
            let nike = await db.get().collection(collection.PRODUCT_COLLECTION).count({ brand: "NIKE" })
            var adidas = await db.get().collection(collection.PRODUCT_COLLECTION).count({ brand: "ADIDAS" })
            var puma = await db.get().collection(collection.PRODUCT_COLLECTION).count({ brand: "PUMA" })
            var bata = await db.get().collection(collection.PRODUCT_COLLECTION).count({ brand: "BATA" })
            var converse = await db.get().collection(collection.PRODUCT_COLLECTION).count({ brand: "CONVERSE" })
            var cat = await db.get().collection(collection.PRODUCT_COLLECTION).count({ brand: "CAT" })

            DifferentBrands = {}
            DifferentBrands.nike = nike,
                DifferentBrands.adidas = adidas,
                DifferentBrands.puma = puma,
                DifferentBrands.bata = bata,
                DifferentBrands.converse = converse,
                DifferentBrands.cat = cat

            resolve(DifferentBrands)

        })
    },


    StockManage: () => {
        return new Promise(async (resolve, reject) => {
            let OutofStock = await db.get().collection(collection.PRODUCT_COLLECTION).count({ quantity: 0 })
            let Instock = await db.get().collection(collection.PRODUCT_COLLECTION).count({ quantity: { $gt: 0 } })
            console.log('OutofStock.................', OutofStock);
            console.log('Instock.................', Instock);

            BrandsStock = {}
            BrandsStock.OutofStock = OutofStock,
                BrandsStock.Instock = Instock

            resolve(BrandsStock)


        })

    },

    getCatgory: () => {
        return new Promise(async (resolve, reject) => {
            var getCatagory = await db.get().collection(collection.CATAGORY_OFFER_COLLECTION).find().toArray()
            resolve(getCatagory)
        })
    },


    insertBanner: (bannerData) => {
        return new Promise(async (resolve, reject) => {
            var insertBanners = await db.get().collection(collection.BANNER_COLLECTION).insertOne(bannerData)
            resolve(insertBanners.insertedId)
        })

    },

    getBannerResult: () => {

        return new Promise(async (resolve, reject) => {
            var getResult = await db.get().collection(collection.BANNER_COLLECTION).find().toArray()
            resolve(getResult)
        })

    },


    deleteBanner:(brId)=>{
        return new Promise (async(resolve,reject)=>{
            var deletedBanner = await db.get().collection(collection.BANNER_COLLECTION).deleteOne({_id:objectId(brId)})
            resolve(deletedBanner)
        })
    }




}