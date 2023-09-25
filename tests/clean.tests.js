import expect from 'expect';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

let collection;

if (Meteor.isClient) {
    collection = new Mongo.Collection('cleanTests', { connection: null });
} else {
    collection = new Mongo.Collection('cleanTests');
}

describe('clean options', function () {
    describe('filter', function () {
        it('keeps default schema clean options', async function () {
            const schema = new SimpleSchema({
                name: String,
            }, {
                clean: {
                    filter: false,
                },
            });

            collection.attachSchema(schema, { replace: true });

            collection.insertAsync({ name: 'name', bad: 'prop' })
                .then(() => {
                    throw new Error('should not get here');
                })
                .catch((error) => {
                    expect(error instanceof Error).toBe(true);
                });
        });

        it('keeps operation clean options', async function () {
            const schema = new SimpleSchema({
                name: String,
            }, {
                clean: {
                    filter: true,
                },
            });

            collection.attachSchema(schema, { replace: true });

            await collection.insertAsync({ name: 'name', bad: 'prop' }, { filter: false })
                .then(() => {
                    throw new Error('should not get here');
                })
                .catch((error) => {
                    console.log(error);
                    expect(error instanceof Error).toBe(true);
                });
        });

        it('has clean option on by default', async function () {
            const schema = new SimpleSchema({ name: String });

            collection.attachSchema(schema, { replace: true });

            await collection.insertAsync({ name: 'name', bad: 'prop' });
        });
    });

    describe('autoConvert', function () {
        it('keeps default schema clean options', async function () {
            const schema = new SimpleSchema({
                name: String,
            }, {
                clean: {
                    autoConvert: false,
                },
            });

            collection.attachSchema(schema, { replace: true });

            await collection.insertAsync({ name: 1 })
                .then(() => {
                    throw new Error('should not get here');
                })
                .catch((error) => {
                    expect(error instanceof Error).toBe(true);
                });
        });

        it('keeps operation clean options', async function () {
            const schema = new SimpleSchema({
                name: String,
            }, {
                clean: {
                    autoConvert: true,
                },
            });

            collection.attachSchema(schema, { replace: true });

            await collection.insertAsync({ name: 1 }, { autoConvert: false })
                .then(() => {
                    throw new Error('should not get here');
                })
                .catch((error) => {
                    expect(error instanceof Error).toBe(true);
                })
        });

        it('has clean option on by default', async function () {
            const schema = new SimpleSchema({ name: String });

            collection.attachSchema(schema, { replace: true });

            collection.insertAsync({ name: 1 });
        });
    });

    describe('removeEmptyStrings', function () {
        it('keeps default schema clean options', async function () {
            const schema = new SimpleSchema({
                name: String,
                other: Number,
            }, {
                clean: {
                    removeEmptyStrings: false,
                },
            });

            collection.attachSchema(schema, { replace: true });

            await collection.insertAsync({ name: '', other: 1 });
        });

        it('keeps operation clean options', async function () {
            const schema = new SimpleSchema({
                name: String,
                other: Number,
            }, {
                clean: {
                    removeEmptyStrings: true,
                },
            });

            collection.attachSchema(schema, { replace: true });

            await collection.insertAsync({ name: '', other: 1 }, { removeEmptyStrings: false });
        });

        it('has clean option on by default', async function () {
            const schema = new SimpleSchema({ name: String, other: Number });

            collection.attachSchema(schema, { replace: true });

            await collection.insertAsync({ name: '', other: 1 })
                .then(() => {
                    throw new Error('should not get here');
                })
                .catch((error) => {
                    expect(error instanceof Error).toBe(true);
                });
        });
    });

    describe('trimStrings', function () {
        it('keeps default schema clean options', async function () {
            const schema = new SimpleSchema({
                name: String,
            }, {
                clean: {
                    trimStrings: false,
                },
            });

            collection.attachSchema(schema, { replace: true });

            const _id = await collection.insertAsync({ name: ' foo ' });
            expect((await collection.findOneAsync(_id))).toEqual({ _id, name: ' foo ' });
        });

        it('keeps operation clean options', async function () {
            const schema = new SimpleSchema({
                name: String,
            }, {
                clean: {
                    trimStrings: true,
                },
            });

            collection.attachSchema(schema, { replace: true });

            const _id = await collection.insertAsync({ name: ' foo ' }, { trimStrings: false });
            expect((await collection.findOneAsync(_id))).toEqual({ _id, name: ' foo ' });
        });

        it('has clean option on by default', async function () {
            const schema = new SimpleSchema({ name: String });

            collection.attachSchema(schema, { replace: true });

            const _id = await collection.insertAsync({ name: ' foo ' });
            expect(await collection.findOneAsync(_id)).toEqual({ _id, name: 'foo' });
        });
    });
});

