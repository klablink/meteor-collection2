import expect from 'expect';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const defaultValuesSchema = new SimpleSchema({
    bool1: {
        type: Boolean,
        defaultValue: false,
    },
});

const defaultValues = new Mongo.Collection('dv');
defaultValues.attachSchema(defaultValuesSchema);

export default function addDefaultValuesTests() {
    it('defaultValues', function (done) {
        let p;

        // Base case
        defaultValues.insertAsync({})
            .then(async (testId1) => {
                p = await defaultValues.findOneAsync(testId1);
                expect(p.bool1).toBe(false);

                // Ensure that default values do not mess with inserts and updates of the field
                defaultValues.insertAsync({
                    bool1: true,
                }).then(async (testId2) => {
                    p = await defaultValues.findOneAsync(testId2);
                    expect(p.bool1).toBe(true);

                    defaultValues.updateAsync(testId1, {
                        $set: {
                            bool1: true,
                        },
                    }).then(async () => {
                        p = await defaultValues.findOneAsync(testId1);
                        expect(p.bool1).toBe(true);
                        done();
                    });
                });
            });
    });
};
