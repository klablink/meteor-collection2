import expect from 'expect';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const productSchema = new SimpleSchema({
    _id: {
        type: String,
        optional: true,
    },
    title: {
        type: String,
        defaultValue: '',
    },
    type: {
        label: 'Product Type',
        type: String,
        defaultValue: 'simple',
    },
    description: {
        type: String,
        defaultValue: 'This is a simple product.',
    },
});

const productVariantSchema = new SimpleSchema({
    _id: {
        type: String,
        optional: true,
    },
    title: {
        type: String,
        defaultValue: '',
    },
    optionTitle: {
        label: 'Option',
        type: String,
        optional: true,
    },
    type: {
        label: 'Product Variant Type',
        type: String,
        defaultValue: 'variant',
    },
    price: {
        label: 'Price',
        type: Number,
        min: 0,
        optional: true,
        defaultValue: 5,
    },
    createdAt: {
        type: Date,
    },
});

const extendedProductSchema = new SimpleSchema(productSchema);
extendedProductSchema.extend({
    barcode: {
        type: String,
        defaultValue: 'ABC123',
    },
});

/* Products */

// Need to define the client one on both client and server
let products = new Mongo.Collection('TestProductsClient');
products.attachSchema(productSchema, { selector: { type: 'simple' } });
products.attachSchema(productVariantSchema, { selector: { type: 'variant' } });
if (Meteor.isServer) {
    products = new Mongo.Collection('TestProductsServer');
    products.attachSchema(productSchema, { selector: { type: 'simple' } });
    products.attachSchema(productVariantSchema, { selector: { type: 'variant' } });
}

/* Extended Products */
// Need to define the client one on both client and server
let extendedProducts = new Mongo.Collection('ExtendedProductsClient');
extendedProducts.attachSchema(productSchema, { selector: { type: 'simple' } });
extendedProducts.attachSchema(productVariantSchema, { selector: { type: 'variant' } });
extendedProducts.attachSchema(extendedProductSchema, { selector: { type: 'simple' } });
if (Meteor.isServer) {
    extendedProducts = new Mongo.Collection('ExtendedProductsServer');
    extendedProducts.attachSchema(productSchema, { selector: { type: 'simple' } });
    extendedProducts.attachSchema(productVariantSchema, { selector: { type: 'variant' } });
    extendedProducts.attachSchema(extendedProductSchema, { selector: { type: 'simple' } });
}

export default function addMultiTests() {
    describe('multiple top-level schemas', function () {
        beforeEach(async function () {
            await products.find({}).forEachAsync(async (doc) => {
                await products.removeAsync(doc._id);
            });

            await extendedProducts.find({}).forEachAsync(async (doc) => {
                await products.removeAsync(doc._id);
            });

            /*
            for await (const doc of products.find({})) {
                await products.removeAsync(doc._id);
            }

            for await (const doc of extendedProducts.find({})) {
                await products.removeAsync(doc._id);
            }
            */
        });

        it('works', function () {
            const c = new Mongo.Collection('multiSchema');

            // Attach two different schemas
            c.attachSchema(new SimpleSchema({
                one: { type: String },
            }));
            c.attachSchema(new SimpleSchema({
                two: { type: String },
            }));

            // Check the combined schema
            let combinedSchema = c.simpleSchema();
            expect(combinedSchema._schemaKeys.includes('one')).toBe(true);
            expect(combinedSchema._schemaKeys.includes('two')).toBe(true);
            expect(combinedSchema.schema('two').type).toEqual(SimpleSchema.oneOf(String));

            // Attach a third schema and make sure that it extends/overwrites the others
            c.attachSchema(new SimpleSchema({
                two: { type: SimpleSchema.Integer },
            }));
            combinedSchema = c.simpleSchema();
            expect(combinedSchema._schemaKeys.includes('one')).toBe(true);
            expect(combinedSchema._schemaKeys.includes('two')).toBe(true);
            expect(combinedSchema.schema('two').type).toEqual(SimpleSchema.oneOf(SimpleSchema.Integer));

            // Ensure that we've only attached two deny functions
            expect(c._validators.insert.deny.length).toBe(2);
            expect(c._validators.update.deny.length).toBe(2);
        });

        it('inserts doc correctly with selector passed via doc', async function () {
            const productId = await products.insertAsync({
                title: 'Product one',
                type: 'simple', // selector in doc
            });

            const product = await products.findOneAsync(productId);
            expect(product.description).toBe('This is a simple product.');
            expect(product.price).toBe(undefined);

            const productId3 = await products.insertAsync({
                title: 'Product three',
                createdAt: new Date(),
                type: 'variant', // other selector in doc
            });
            const product3 = await products.findOneAsync(productId3);
            expect(product3.description).toBe(undefined);
            expect(product3.price).toBe(5);
        });

        if (Meteor.isServer) {
            // Passing selector in options works only on the server because
            // client options are not sent to the server and made availabe in
            // the deny functions, where we call .simpleSchema()
            //
            // Also synchronous only works on server
            it('insert selects the correct schema', async function () {
                const productId = await products.insertAsync({
                    title: 'Product one',
                }, { selector: { type: 'simple' } });

                const productVariantId = await products.insertAsync({
                    title: 'Product variant one',
                    createdAt: new Date(),
                }, { selector: { type: 'variant' } });

                const product = await products.findOneAsync(productId);
                const productVariant = await products.findOneAsync(productVariantId);

                // we should receive new docs with correct property set for each type of doc
                expect(product.description).toBe('This is a simple product.');
                expect(product.price).toBe(undefined);
                expect(productVariant.description).toBe(undefined);
                expect(productVariant.price).toBe(5)
            });

            it('inserts doc correctly with selector passed via doc and via <option>', async function () {
                const productId = await products.insertAsync({
                    title: 'Product one',
                    type: 'simple', // selector in doc
                });
                const product = await products.findOneAsync(productId);
                expect(product.description).toBe('This is a simple product.');
                expect(product.price).toBe(undefined);

                const productId2 = await products.insertAsync({
                    title: 'Product two',
                }, { selector: { type: 'simple' } }); // selector in option

                const product2 = await products.findOneAsync(productId2);
                expect(product2.description).toBe('This is a simple product.');
                expect(product2.price).toBe(undefined);

                const productId3 = await products.insertAsync({
                    title: 'Product three',
                    createdAt: new Date(),
                    type: 'variant', // other selector in doc
                });

                const product3 = await products.findOneAsync(productId3);
                expect(product3.description).toBe(undefined);
                expect(product3.price).toBe(5);
            });

            it('upsert selects the correct schema', async function () {
                await products.insertAsync({ title: 'Product one' }, { selector: { type: 'simple' } });

                await products.upsertAsync({ title: 'Product one', type: 'simple' },
                    { $set: { description: 'This is a modified product one.' } },
                    { selector: { type: 'simple' } });

                await products.upsertAsync({ title: 'Product two', type: 'simple' },
                    { $set: { description: 'This is a product two.' } },
                    { selector: { type: 'simple' } });

                const productsList = await products.find().fetchAsync();
                expect(productsList.length).toBe(2);
                expect(productsList[0].description).toBe('This is a modified product one.');
                expect(productsList[0].price).toBe(undefined);
                expect(productsList[1].description).toBe('This is a product two.');
                expect(productsList[1].price).toBe(undefined);
            });

            it('upserts doc correctly with selector passed via <query>, via <update> and via <option>', async function () {
                const productId = await products.insertAsync({
                    title: 'Product one',
                }, { selector: { type: 'simple' } });

                await products.upsertAsync(
                    { title: 'Product one', type: 'simple' }, // selector in <query>
                    { $set: { description: 'This is a modified product one.' } },
                );
                let product = await products.findOneAsync(productId);
                expect(product.description).toBe('This is a modified product one.');
                expect(product.price).toBe(undefined);

                await products.upsertAsync(
                    { title: 'Product one' },
                    {
                        $set: {
                            description: 'This is a modified product two.',
                            type: 'simple', // selector in <update>
                        },
                    },
                );
                product = await products.findOneAsync(productId);
                expect(product.description).toBe('This is a modified product two.');
                expect(product.price).toBe(undefined);

                // we have to pass selector directly because it is required field
                await products.upsertAsync(
                    { title: 'Product one', type: 'simple' },
                    {
                        $set: {
                            description: 'This is a modified product three.',
                        },
                    },
                    { selector: { type: 'simple' } },
                );
                product = await products.findOneAsync(productId);
                expect(product.description).toBe('This is a modified product three.');
                expect(product.price).toBe(undefined);
            });

            it('update selects the correct schema', async function () {
                const productId = await products.insertAsync({
                    title: 'Product one',
                }, { selector: { type: 'simple' } });

                const productVariantId = await products.insertAsync({
                    title: 'Product variant one',
                    createdAt: new Date(),
                }, { selector: { type: 'variant' } });

                await products.updateAsync(productId, {
                    $set: { title: 'New product one' },
                }, { selector: { type: 'simple' } });

                await products.updateAsync(productVariantId, {
                    $set: { title: 'New productVariant one' },
                }, { selector: { type: 'simple' } });

                const product = await products.findOneAsync(productId);
                const productVariant = await products.findOneAsync(productVariantId);

                // we should receive new docs with the same properties as before update
                expect(product.description).toBe('This is a simple product.');
                expect(product.price).toBe(undefined);
                expect(productVariant.description).toBe(undefined);
                expect(productVariant.price).toBe(5);
            });

            it('updates doc correctly with selector passed via <query>, via <update> and via <option>', async function () {
                const productId = await products.insertAsync({
                    title: 'Product one',
                }, { selector: { type: 'simple' } });

                await products.updateAsync(
                    { title: 'Product one', type: 'simple' }, // selector in <query>
                    { $set: { description: 'This is a modified product one.' } },
                );
                let product = await products.findOneAsync(productId);
                expect(product.description).toBe('This is a modified product one.');
                expect(product.price).toBe(undefined);

                await products.updateAsync(
                    { title: 'Product one' },
                    {
                        $set: {
                            description: 'This is a modified product two.',
                            type: 'simple', // selector in <update>
                        },
                    },
                );
                product = await products.findOneAsync(productId);
                expect(product.description).toBe('This is a modified product two.');
                expect(product.price).toBe(undefined);

                // we have to pass selector directly because it is required field
                await products.updateAsync(
                    { title: 'Product one', type: 'simple' },
                    {
                        $set: {
                            description: 'This is a modified product three.',
                        },
                    },
                    { selector: { type: 'simple' } },
                );
                product = await products.findOneAsync(productId);
                expect(product.description).toBe('This is a modified product three.');
                expect(product.price).toBe(undefined);
            });

            it('allows changing schema on update operation', async function () {
                const productId = await products.insertAsync({
                    title: 'Product one',
                }, { selector: { type: 'simple' } });

                let product = await products.findOneAsync(productId);
                await products.updateAsync({ _id: product._id }, {
                    $set: {
                        price: 10, // validating against new schema
                        type: 'variant',
                    },
                });

                await products.updateAsync({ _id: product._id }, {
                    $unset: { description: '' },
                }, { selector: { type: 'variant' }, validate: false });
                product = await products.findOneAsync(productId);

                expect(product.description).toBe(undefined);
                expect(product.price).toBe(10);
                expect(product.type).toBe('variant');
            });
        }

        it('returns the correct schema on `MyCollection.simpleSchema(object)`', async function () {
            const schema = products.simpleSchema({
                title: 'Product one',
                type: 'variant',
            });
            expect(schema._schema.type.label).toBe('Product Variant Type');
        });

        if (Meteor.isServer) {
            // Passing selector in options works only on the server because
            // client options are not sent to the server and made availabe in
            // the deny functions, where we call .simpleSchema()
            it('insert selects the correct extended schema', async function () {
                const productId = await extendedProducts.insertAsync({
                    title: 'Extended Product one',
                }, { selector: { type: 'simple' } });

                const productVariantId = await extendedProducts.insertAsync({
                    title: 'Product variant one',
                    createdAt: new Date(),
                }, { selector: { type: 'variant' } });

                const extendedProduct = await extendedProducts.findOneAsync(productId);
                const extendedProductVariant = await extendedProducts.findOneAsync(productVariantId);

                // we should receive new docs with correct property set for each type of doc
                expect(extendedProduct.description).toBe('This is a simple product.');
                expect(extendedProduct.title).toBe('Extended Product one');
                expect(extendedProduct.barcode).toBe('ABC123');
                expect(extendedProduct.price).toBe(undefined);
                expect(extendedProductVariant.description).toBe(undefined);
                expect(extendedProductVariant.price).toBe(5);
                expect(extendedProductVariant.barcode).toBe(undefined);
            });

            it('update selects the correct extended schema', async function () {
                const productId = await extendedProducts.insertAsync({
                    title: 'Product one',
                }, { selector: { type: 'simple' } });

                const productVariantId = await extendedProducts.insertAsync({
                    title: 'Product variant one',
                    createdAt: new Date(),
                }, { selector: { type: 'variant' } });

                await extendedProducts.updateAsync(productId, {
                    $set: { barcode: 'XYZ456' },
                }, { selector: { type: 'simple' } });

                await extendedProducts.updateAsync(productVariantId, {
                    $set: { title: 'New productVariant one' },
                }, { selector: { type: 'simple' } });

                const product = await extendedProducts.findOneAsync(productId);
                const productVariant = await extendedProducts.findOneAsync(productVariantId);

                // we should receive new docs with the same properties as before update
                expect(product.description).toBe('This is a simple product.');
                expect(product.barcode).toBe('XYZ456')
                expect(product.price).toBe(undefined);
                expect(productVariant.description).toBe(undefined);
                expect(productVariant.price).toBe(5);
                expect(productVariant.barcode).toBe(undefined);
            });
        }
    });
}
