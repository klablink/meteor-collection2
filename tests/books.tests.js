import expect from 'expect';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const booksSchema = new SimpleSchema({
    title: {
        type: String,
        label: 'Title',
        max: 200,
    },
    author: {
        type: String,
        label: 'Author',
    },
    copies: {
        type: SimpleSchema.Integer,
        label: 'Number of copies',
        min: 0,
    },
    lastCheckedOut: {
        type: Date,
        label: 'Last date this book was checked out',
        optional: true,
    },
    summary: {
        type: String,
        label: 'Brief summary',
        optional: true,
        max: 1000,
    },
    isbn: {
        type: String,
        label: 'ISBN',
        optional: true,
    },
    field1: {
        type: String,
        optional: true,
    },
    field2: {
        type: String,
        optional: true,
    },
    createdAt: {
        type: Date,
        optional: true,
    },
    updatedAt: {
        type: Date,
        optional: true,
    },
});

const books = new Mongo.Collection('books');
books.attachSchema(booksSchema);

const upsertTest = new Mongo.Collection('upsertTest');
upsertTest.attachSchema(new SimpleSchema({
    _id: { type: String },
    foo: { type: Number },
}));

export default function addBooksTests() {
    describe('insert', async function () {
        beforeEach(async function () {
            for (const book of await books.find({}).fetchAsync()) {
                await books.removeAsync(book._id);
            }
        });

        it('required 1', function (done) {
            const id = books.insertAsync({
                title: 'Ulysses',
                author: 'James Joyce',
            })
                .then((result) => {
                    done('should not get here');
                })
                .catch((error) => {
                    //The insert will fail, error will be set,
                    expect(!!error).toBe(true);
                    //and result will be false because "copies" is required.
                    // TODO expect(result).toBe(false);
                    //The list of errors is available by calling books.simpleSchema().namedContext().validationErrors()
                    const validationErrors = books.simpleSchema().namedContext().validationErrors();
                    expect(validationErrors.length).toBe(1);

                    const key = validationErrors[0] || {};
                    expect(key.name).toBe('copies');
                    expect(key.type).toBe('required');
                    done();
                });


        });

        it('required 2', async function () {
            let title;
            if (Meteor.isClient) {
                title = "Validate False Client";
            } else {
                title = "Validate False Server";
            }

            let error;
            let newId;
            let result;
            // do a good one to set up update test
            try {
                newId = await books.insertAsync({
                    title: title + ' 2',
                    author: 'James Joyce',
                    copies: 1,
                }, {
                    validate: false,
                    validationContext: 'validateFalse2',
                })
            } catch (e) {
                error = e;
            }

            let validationErrors = books.simpleSchema().namedContext('validateFalse2').validationErrors();

            expect(!!error).toBe(false);
            expect(!!newId).toBe(true);
            expect(validationErrors.length).toBe(0);

            const insertedBook = await books.findOneAsync({ title: title + ' 2' });
            expect(!!insertedBook).toBe(true);

            try {
                result = await books.updateAsync({
                    _id: newId,
                }, {
                    $set: {
                        copies: 'Yes Please',
                    },
                }, {
                    validate: false,
                    validationContext: 'validateFalse3',
                });
                error = null;
            } catch (e) {
                error = e;
            }

            let updatedBook;
            validationErrors = books.simpleSchema().namedContext('validateFalse3').validationErrors();

            if (Meteor.isClient) {
                // When validate: false on the client, we should still get a validation error and invalidKeys from the server
                expect(!!error).toBe(true);
                // There should be an `invalidKeys` property on the error, too
                expect(error.invalidKeys.length).toBe(1);
                expect(!!result).toBe(false);
                expect(validationErrors.length).toBe(1);

                updatedBook = await books.findOneAsync(newId);
                expect(!!updatedBook).toBe(true);
                // copies should still be 1 because our new value failed validation on the server
                expect(updatedBook.copies).toBe(1);
            } else {
                // When validate: false on the server, validation should be skipped
                expect(!!error).toBe(false);
                expect(!!result).toBe(true);
                expect(validationErrors.length).toBe(0);

                updatedBook = await books.findOneAsync(newId);
                expect(!!updatedBook).toBe(true);
                // copies should be changed despite being invalid because we skipped validation on the server
                expect(updatedBook.copies).toBe('Yes Please');
            }

            // now try a good one
            try {
                result = await books.updateAsync({
                    _id: newId,
                }, {
                    $set: {
                        copies: 3,
                    },
                }, {
                    validate: false,
                    validationContext: 'validateFalse4',
                })
                error = null;
            } catch (e) {
                error = e;
            }

            validationErrors = books.simpleSchema().namedContext('validateFalse4').validationErrors();
            expect(!!error).toBe(false);
            expect(result).toBe(1);
            expect(validationErrors.length).toBe(0);

            updatedBook = await books.findOneAsync(newId);
            expect(!!updatedBook).toBe(true);
            // copies should be changed because we used a valid value
            expect(updatedBook.copies).toBe(3);
        });

        if (Meteor.isServer) {
            it('no validation when calling underlying _collection on the server', async function () {
                await books._collection.insertAsync({
                    title: 'Ulysses',
                    author: 'James Joyce',
                    copies: 1,
                    updatedAt: new Date(),
                })
            });
        }
    });

    if (Meteor.isServer) {
        describe('upsert', function () {
            function getCallback(done) {
                return (error, result) => {
                    expect(!!error).toBe(false);
                    expect(result.numberAffected).toBe(1);

                    const validationErrors = books.simpleSchema().namedContext().validationErrors();
                    expect(validationErrors.length).toBe(0);

                    done();
                };
            }

            function getUpdateCallback(done) {
                return (error, result) => {
                    if (error) console.error(error);
                    expect(!!error).toBe(false);
                    expect(result).toBe(1);

                    const validationErrors = books.simpleSchema().namedContext().validationErrors();
                    expect(validationErrors.length).toBe(0);

                    done();
                };
            }

            function getErrorCallback(done) {
                return (error, result) => {
                    expect(!!error).toBe(true);
                    expect(!!result).toBe(false);

                    const validationErrors = books.simpleSchema().namedContext().validationErrors();
                    expect(validationErrors.length).toBe(1);

                    done();
                };
            }

            it('valid', function (done) {
                const callback = getCallback(done);

                books.upsertAsync({
                    title: 'Ulysses',
                    author: 'James Joyce',
                }, {
                    $set: {
                        title: 'Ulysses',
                        author: 'James Joyce',
                        copies: 1,
                    },
                })
                    .then((result) => callback(null, result))
                    .catch((error) => callback(error, null));
            });

            it('upsert as update should update entity by _id - valid', function (done) {
                const callback = getCallback(done);

                books.insertAsync({ title: 'new', author: 'author new', copies: 2 })
                    .then((id) => {
                        books.upsertAsync({
                            _id: id,
                        }, {
                            $set: {
                                title: 'Ulysses',
                                author: 'James Joyce',
                                copies: 1,
                            },
                        })
                            .then((result) => callback(null, result))
                            .catch((error) => callback(error, null));
                    });

            });

            it('upsert as update - valid', function (done) {
                const callback = getUpdateCallback(done);

                books.updateAsync({
                    title: 'Ulysses',
                    author: 'James Joyce',
                }, {
                    $set: {
                        title: 'Ulysses',
                        author: 'James Joyce',
                        copies: 1,
                    },
                }, {
                    upsert: true,
                })
                    .then((result) => callback(null, result))
                    .catch((error) => callback(error, null));
            });

            it('upsert as update with $and', function (done) {
                const callback = getUpdateCallback(done);

                books.updateAsync({
                    $and: [
                        { title: 'Ulysses' },
                        { author: 'James Joyce' },
                    ],
                }, {
                    $set: {
                        title: 'Ulysses',
                        author: 'James Joyce',
                        copies: 1,
                    },
                }, {
                    upsert: true,
                })
                    .then((result) => callback(null, result))
                    .catch((error) => callback(error, null));
            });

            it('upsert - invalid', function (done) {
                const callback = getErrorCallback(done);

                books.upsertAsync({
                    title: 'Ulysses',
                    author: 'James Joyce',
                }, {
                    $set: {
                        copies: -1,
                    },
                })
                    .then((result) => callback(null, result))
                    .catch((error) => callback(error, false));
            });

            it('upsert as update - invalid', function (done) {
                const callback = getErrorCallback(done);

                books.updateAsync({
                    title: 'Ulysses',
                    author: 'James Joyce',
                }, {
                    $set: {
                        copies: -1,
                    },
                }, {
                    upsert: true,
                })
                    .then((result) => callback(null, result))
                    .catch((error) => callback(error, false));
            });

            it('upsert - valid with selector', function (done) {
                const callback = getCallback(done);

                books.upsertAsync({
                    title: 'Ulysses',
                    author: 'James Joyce',
                }, {
                    $set: {
                        copies: 1,
                    },
                })
                    .then((result) => callback(null, result))
                    .catch((error) => callback(error, null));
            });

            it('upsert as update - valid with selector', function (done) {
                const callback = getUpdateCallback(done);

                books.updateAsync({
                    title: 'Ulysses',
                    author: 'James Joyce',
                }, {
                    $set: {
                        copies: 1,
                    },
                }, {
                    upsert: true,
                })
                    .then((result) => callback(null, result))
                    .catch((error) => callback(error, null));
            });
        });
    }

    it('validate false', async function () {
        let title;
        if (Meteor.isClient) {
            title = 'Validate False Client';
        } else {
            title = 'Validate False Server';
        }

        let result;
        try {
            result = await books.insertAsync({
                title: title,
                author: 'James Joyce',
            }, {
                validate: false,
                validationContext: 'validateFalse',
            })

            let insertedBook;
            const validationErrors = books.simpleSchema().namedContext('validateFalse').validationErrors();

            if (Meteor.isServer) {
                expect(!!result).toBe(true);
                expect(validationErrors.length).toBe(0);

                insertedBook = await books.findOneAsync({ title: title });
                expect(!!insertedBook).toBe(true);
            }

        } catch (error) {
            if (Meteor.isClient) {
                let insertedBook;
                const validationErrors = books.simpleSchema().namedContext('validateFalse').validationErrors();

                // There should be an `invalidKeys` property on the error, too
                expect(error.invalidKeys.length).toBe(1);
                expect(!!result).toBe(false);
                expect(validationErrors.length).toBe(1);

                insertedBook = books.findOne({ title: title });
                expect(!!insertedBook).toBe(false);
            } else {
                throw error;
            }

        }
    });

    if (Meteor.isServer) {
        it('bypassCollection2', async function () {
            let id = await books.insertAsync({}, { bypassCollection2: true })

            await books.updateAsync(id, { $set: { copies: 2 } }, { bypassCollection2: true })
        });

        it('everything filtered out', async function () {
            try {
                await upsertTest.updateAsync({ _id: '123' }, {
                    $set: {
                        boo: 1,
                    },
                });
            } catch (error) {
                expect(error.message).toBe('After filtering out keys not in the schema, your modifier is now empty');
            }

        });

        it('upsert works with schema that allows _id', async function () {
            await upsertTest.removeAsync({});

            const upsertTestId = await upsertTest.insertAsync({ foo: 1 });

            await upsertTest.updateAsync({ _id: upsertTestId }, {
                $set: {
                    foo: 2,
                },
            }, {
                upsert: true,
            });
            const doc = await upsertTest.findOneAsync(upsertTestId);
            expect(doc.foo).toBe(2);
        });
    }

}
