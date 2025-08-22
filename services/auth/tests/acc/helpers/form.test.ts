import { describe, it, expect } from 'vitest';
import {
  parseFormTag,
  parseFormAttributes,
  parseFormContent,
  parseInputs,
  parseTextAreas,
  parseSelects,
  processInputs,
  processTextAreas,
  processSelects,
} from './form';

import type { FormData } from './form';

const htmlExample = `
<form action="/enter-email" method="post" novalidate>
  <input type="hidden" name="_csrf" value="50b0ae"/>
  
  <div class="govuk-form-group">
    <h1 class="govuk-label-wrapper">
      <label class="govuk-label govuk-label--l" for="email">
        Enter your email address to sign in to your GOV.UK One Login
      </label>
    </h1>
    <input class="govuk-input" id="email" name="email" type="email" spellcheck="false" autocomplete="email">
  </div>
  
  <button type="Submit" data-prevent-double-click="true" class="govuk-button" data-module="govuk-button">
    Continue
  </button>
</form>
`;

describe('Form parsing helper tests', () => {
  it('should parse a form tag from html', () => {
    const formTag = parseFormTag(htmlExample);
    expect(formTag).toEqual(
      `<form action="/enter-email" method="post" novalidate>`,
    );
  });
  it('should parse form attributes from a form tag', () => {
    const formData: FormData = parseFormAttributes(
      `<form action="/enter-email" method="post" novalidate>`,
    );
    expect(formData).toEqual({
      action: '/enter-email',
      method: 'post',
      csrf: null,
      inputs: [],
    });
  });
  it('should parse form content', () => {
    const formContent: string = parseFormContent(htmlExample);
    expect(formContent).toBeTruthy();
  });
  it('should parse inputs', () => {
    const formContent = `
                            <input type="hidden" name="_csrf" value="50b0ae"/>
  
                            <div class="govuk-form-group">
                              <h1 class="govuk-label-wrapper">
                                <label class="govuk-label govuk-label--l" for="email">
                                  Enter your email address to sign in to your GOV.UK One Login
                                </label>
                              </h1>
                              <input class="govuk-input" id="email" name="email" type="email" spellcheck="false" autocomplete="email">
                            </div>
  
                            <button type="Submit" data-prevent-double-click="true" class="govuk-button" data-module="govuk-button">
                              Continue
                            </button>
        `;
    const inputMatches = parseInputs(formContent);
    expect(inputMatches).toEqual([
      '<input type="hidden" name="_csrf" value="50b0ae"/>',
      '<input class="govuk-input" id="email" name="email" type="email" spellcheck="false" autocomplete="email">',
    ]);
  });
  it('should parse checkboxes and radio buttons', () => {
    const formContent = `<div class="form-group">
                               <input type="checkbox" id="newsletter" name="newsletter" value="yes">
                               <label for="newsletter">Subscribe to newsletter</label>
                             </div>
  
                             <div class="form-group">
                               <input type="radio" id="contact-email" name="contact_method" value="email" checked>
                               <label for="contact-email">Contact by Email</label>

                               <input type="radio" id="contact-phone" name="contact_method" value="phone">
                               <label for="contact-phone">Contact by Phone</label>
                             </div>`;

    const checkboxMatches: Array<string> = parseInputs(formContent);

    expect(checkboxMatches).toEqual([
      '<input type="checkbox" id="newsletter" name="newsletter" value="yes">',
      '<input type="radio" id="contact-email" name="contact_method" value="email" checked>',
      '<input type="radio" id="contact-phone" name="contact_method" value="phone">',
    ]);
  });
  it('should process inputs', () => {
    const formData: FormData = {
      action: '/enter-email',
      method: 'post',
      csrf: null,
      inputs: [],
    };
    const inputMatches: Array<string> = [
      '<input type="hidden" name="_csrf" value="50b0ae"/>',
      '<input class="govuk-input" id="email" name="email" type="email" spellcheck="false" autocomplete="email">',
    ];
    processInputs(inputMatches, formData);
    expect(formData.inputs).toEqual([
      {
        name: '_csrf',
        type: 'hidden',
        value: '50b0ae',
        id: '',
        required: false,
        placeholder: '',
        className: '',
      },
      {
        name: 'email',
        type: 'email',
        value: '',
        id: 'email',
        required: false,
        placeholder: '',
        className: 'govuk-input',
      },
    ]);
  });
  it('should process checkboxes and radio buttons', () => {
    const formData: FormData = {
      action: '/enter-email',
      method: 'post',
      csrf: null,
      inputs: [],
    };

    const checkboxMatches: Array<string> = [
      '<input type="checkbox" id="newsletter" name="newsletter" value="yes">',
      '<input type="radio" id="contact-email" name="contact_method" value="email" checked>',
      '<input type="radio" id="contact-phone" name="contact_method" value="phone">',
    ];
    processInputs(checkboxMatches, formData);
    expect(formData.inputs).toEqual([
      {
        name: 'newsletter',
        type: 'checkbox',
        value: 'yes',
        id: 'newsletter',
        required: false,
        className: '',
        checked: false,
      },
      {
        name: 'contact_method',
        type: 'radio',
        value: 'email',
        id: 'contact-email',
        required: false,
        className: '',
        checked: true,
      },
      {
        name: 'contact_method',
        type: 'radio',
        value: 'phone',
        id: 'contact-phone',
        required: false,
        className: '',
        checked: false,
      },
    ]);
  });
  it('should parse text areas', () => {
    const formContent = `
                            <div class="form-group">
                              <label for="message">Message</label>
                              <textarea class="form-control" id="message" name="message" rows="5" required placeholder="Please enter your message here..."></textarea>
                            </div>
  
                            <div class="form-group">
                              <label for="additional-info">Additional Information</label>
                              <textarea class="form-control" id="additional-info" name="additional_info" rows="3" placeholder="Any additional details..."></textarea>
                            </div>
        `;

    const textAreaMatches: Array<string> = parseTextAreas(formContent);
    expect(textAreaMatches).toEqual([
      '<textarea class="form-control" id="message" name="message" rows="5" required placeholder="Please enter your message here..."></textarea>',
      '<textarea class="form-control" id="additional-info" name="additional_info" rows="3" placeholder="Any additional details..."></textarea>',
    ]);
  });
  it('should process text areas', () => {
    const textAreaMatches = [
      '<textarea class="form-control" id="message" name="message" rows="5" required placeholder="Please enter your message here..."></textarea>',
      '<textarea class="form-control" id="additional-info" name="additional_info" rows="3" placeholder="Any additional details..."></textarea>',
    ];
    const formData: FormData = {
      action: '/enter-email',
      method: 'post',
      csrf: null,
      inputs: [],
    };
    processTextAreas(textAreaMatches, formData);
    expect(formData.inputs).toEqual([
      {
        name: 'message',
        type: 'textarea',
        value: '',
        id: 'message',
        required: true,
        placeholder: 'Please enter your message here...',
        className: 'form-control',
      },
      {
        name: 'additional_info',
        type: 'textarea',
        value: '',
        id: 'additional-info',
        required: false,
        placeholder: 'Any additional details...',
        className: 'form-control',
      },
    ]);
  });
  it('should parse selects', () => {
    const formContent = `
<div class="form-group">
  <label for="country">Country</label>
  <select class="form-select" id="country" name="country" required>
    <option value="">Please select...</option>
    <option value="us">United States</option>
    <option value="uk" selected>United Kingdom</option>
    <option value="ca">Canada</option>
    <option value="au">Australia</option>
  </select>
</div>
  
<div class="form-group">
  <label for="age-range">Age Range</label>
  <select class="form-select" id="age-range" name="age_range">
    <option value="18-25">18-25</option>
    <option value="26-35" selected>26-35</option>
    <option value="36-45">36-45</option>
    <option value="46+">46+</option>
  </select>
</div>
`;
    const selectMatches: Array<string> = parseSelects(formContent);
    expect(selectMatches).toEqual([
      '<select class="form-select" id="country" name="country" required>\n' +
        '    <option value="">Please select...</option>\n' +
        '    <option value="us">United States</option>\n' +
        '    <option value="uk" selected>United Kingdom</option>\n' +
        '    <option value="ca">Canada</option>\n' +
        '    <option value="au">Australia</option>\n' +
        '  </select>',
      '<select class="form-select" id="age-range" name="age_range">\n' +
        '    <option value="18-25">18-25</option>\n' +
        '    <option value="26-35" selected>26-35</option>\n' +
        '    <option value="36-45">36-45</option>\n' +
        '    <option value="46+">46+</option>\n' +
        '  </select>',
    ]);
  });
  it('should process selects', () => {
    const selectMatches: Array<string> = [
      '<select class="form-select" id="country" name="country" required>\n' +
        '    <option value="">Please select...</option>\n' +
        '    <option value="us">United States</option>\n' +
        '    <option value="uk" selected>United Kingdom</option>\n' +
        '    <option value="ca">Canada</option>\n' +
        '    <option value="au">Australia</option>\n' +
        '  </select>',
      '<select class="form-select" id="age-range" name="age_range">\n' +
        '    <option value="18-25">18-25</option>\n' +
        '    <option value="26-35" selected>26-35</option>\n' +
        '    <option value="36-45">36-45</option>\n' +
        '    <option value="46+">46+</option>\n' +
        '  </select>',
    ];
    const formData: FormData = {
      action: '/enter-email',
      method: 'post',
      csrf: null,
      inputs: [],
    };

    processSelects(selectMatches, formData);
  });
});
