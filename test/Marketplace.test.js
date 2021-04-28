require('chai')
    .use(require('chai-as-promised'))
    .should()

const { assert } = require("chai")

const Marketplace = artifacts.require("./Marketplace.sol")

contract('Marketplace', ([deployer, seller, buyer]) => {
    let marketplace

    before( async() => {
        marketplace = await Marketplace.deployed()
    })

    describe( 'deployment', async () => {
        it('deployes successfully', async () => {
            const address = await marketplace.address
            assert.notEqual(address, undefined)
        })

        it('has a name', async () => {
            const name = await marketplace.name()
            assert.equal(name, 'I love my motherland.')
        })
    } )

    describe( 'products', async () => {
        let result, productCount

        before( async() => {
            result = await marketplace.createProduct(
                'iPhone X',
                web3.utils.toWei('1', 'Ether'),
                {from: seller}
            )
            productCount = await marketplace.productCount()
        })

        it('creates products', async() => {
            // success
            assert.equal(productCount, 1)
            const event = result.logs[0].args
            assert.equal(event.id.toNumber(), productCount.toNumber(), 'id is correct')
            assert.equal(event.name, 'iPhone X', 'name is correct')
            assert.equal(event.price, '1000000000000000000', 'price is correct')
            assert.equal(event.owner, seller, 'owner is correct')
            assert.equal(event.purchased, false, 'purchased is correct')

            //failure: product must have a name
            await await marketplace.createProduct('', web3.utils.toWei('1', 'Ether'), {from: seller}).should.be.rejected;
            //failure: product must have a price
            await await marketplace.createProduct('iPhone X', 0, {from: seller}).should.be.rejected;
        })

        it('sells products', async () => {
            // track the seller balance before purchase
            let oldSellerBalance
            oldSellerBalance = await web3.eth.getBalance(seller)
            oldSellerBalance = new web3.utils.BN(oldSellerBalance)

            //success: buyer makes purchase
            result = await marketplace.purchaseProduct(
                productCount, 
                {from:buyer, value: web3.utils.toWei('1', 'Ether')}
            )

            //check logs
            const event = result.logs[0].args
            assert.equal(event.id.toNumber(), productCount.toNumber())
            assert.equal(event.name, 'iPhone X', 'name is correct')
            assert.equal(event.price, '1000000000000000000', 'price is correct')
            assert.equal(event.owner, buyer, 'owner is correct')
            assert.equal(event.purchased, true, 'purchased is correct')

            //check that seller received funds
            let newSellerBalance
            newSellerBalance = await web3.eth.getBalance(seller)
            newSellerBalance = new web3.utils.BN(newSellerBalance)

            let price
            price = web3.utils.toWei('1', 'Ether')
            price = new web3.utils.BN(price)

            const expectedBalance = oldSellerBalance.add(price)

            assert.equal(newSellerBalance.toString(), expectedBalance.toString())

            //failure: tried to buy a produc tthat does not exist, i.e. product must have valid id
            await marketplace.purchaseProduct(99, {from: buyer, vaule: web3.utils.toWei('1', 'Ether')}).should.be.rejected
            // FAILURE: Buyer tries to buy without enough ether
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('0.5', 'Ether') }).should.be.rejected;
            // FAILURE: Deployer tries to buy the product, i.e., product can't be purchased twice
            await marketplace.purchaseProduct(productCount, { from: deployer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected;
            // FAILURE: Buyer tries to buy again, i.e., buyer can't be the seller
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected;
        })
    })
})