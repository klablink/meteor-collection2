import expect from 'expect';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const contextCheckSchema = new SimpleSchema({
  foo: {
    type: String,
    optional: true
  },
  context: {
    type: Object,
    optional: true,
    defaultValue: {},
  },
  'context.userId': {
    type: String,
    optional: true,
    autoValue() {
      return this.userId;
    }
  },
  'context.isFromTrustedCode': {
    type: Boolean,
    optional: true,
    autoValue() {
      return this.isFromTrustedCode;
    }
  },
  'context.isInsert': {
    type: Boolean,
    optional: true,
    autoValue() {
      return this.isInsert;
    }
  },
  'context.isUpdate': {
    type: Boolean,
    optional: true,
    autoValue() {
      return this.isUpdate;
    }
  },
  'context.docId': {
    type: String,
    optional: true,
    autoValue() {
      return this.docId;
    }
  }
});

const contextCheck = new Mongo.Collection('contextCheck');
contextCheck.attachSchema(contextCheckSchema);

export default function addContextTests() {
  it('AutoValue Context', function (done) {
    let testId;

    const callback1 = async () => {
      const ctx = await contextCheck.findOneAsync(testId);
      expect(ctx.context.docId).toBe(testId);
      done();
    };

    const callback2 = async () => {
      const ctx = await contextCheck.findOneAsync(testId);
      expect(ctx.foo).toBe('bar');
      expect(ctx.context.isUpdate).toBe(true);
      expect(ctx.context.isInsert).toBe(false);
      expect(ctx.context.userId).toBe(null);
      expect(ctx.context.docId).toBe(testId);
      expect(ctx.context.isFromTrustedCode).toBe(!Meteor.isClient);

      // make sure docId works with `_id` direct, too
      await contextCheck.updateAsync(testId, {
        $set: {
          context: {},
          foo: "bar"
        }
      }).then(callback1);
    };

    const callback3 = async (result) => {
      testId = result;
      const ctx = await contextCheck.findOneAsync(testId);
      expect(ctx.context.isInsert).toBe(true);
      expect(ctx.context.isUpdate).toBe(false);
      expect(ctx.context.userId).toBe(null);
      expect(ctx.context.docId).toBe(undefined);
      expect(ctx.context.isFromTrustedCode).toBe(!Meteor.isClient);

      contextCheck.updateAsync({
        _id: testId
      }, {
        $set: {
          context: {},
          foo: "bar"
        }
      }).then(callback2);
    };

    contextCheck.insertAsync({})
        .then(callback3)
        .catch((error) => {
            expect(!!error).toBe(false);
        });
  });
}
