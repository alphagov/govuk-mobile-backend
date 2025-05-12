import 'dotenv/config';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';

let sharedSignalToken: string;
let inputPayload: Record<string, any>;

const feature = await loadFeature(
    'feature-tests/functional/features/shared-signal-token-generation.feature' 
); 

describeFeature(feature, ({ Scenario }) => {
    Scenario('Generate only access token',({ Given, When, Then }) => {
            
        Given('Shared Signal has a valid client and secret',  () => {
              When('I have a valid client and secret', () => {
                    inputPayload = {
                        clientId: process.env.CFN_SharedSignalClientId,
                        clientSecret: process.env.CFN_SharedSignalClientSecret,
                    };
                }  
        })
        
});                   

// Given('a valid payload for shared signal token generation', function () {
//     inputPayload = {
//         userId: '12345',
//         timestamp: Date.now(),
//         scope: 'read:messages',
//     };
// });

// Given('an invalid payload for shared signal token generation', function () {
//     inputPayload = {
//         userId: '',
//         timestamp: null,
//         scope: '',
//     };
// });

// When('I generate a shared signal token', function () {
//     try {
//         sharedSignalToken = generateSharedSignalToken(inputPayload);
//     } catch (error) {
//         this.error = error;
//     }
// });

// Then('I should receive a valid shared signal token', function () {
//     expect(sharedSignalToken).to.be.a('string');
//     expect(sharedSignalToken).to.have.length.greaterThan(0);
// });

// Then('I should receive an error indicating invalid payload', function () {
//     expect(this.error).to.exist;
//     expect(this.error.message).to.equal('Invalid payload for token generation');
// });