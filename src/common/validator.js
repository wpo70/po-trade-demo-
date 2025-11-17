'use strict';

// This class collects the properties need to do validation of input fields and
// all of the conversion and validation function for all the input fields in the
// application.  The scanning functions are static and the validity functions
// are members.

import { get } from 'svelte/store';
import active_product from '../stores/active_product.js';
import quotes from '../stores/quotes.js';
import products from '../stores/products.js';
import { rbaToYear } from './rba_handler.js';
import { isBusinessDay } from './formatting.js';

class Validator {
  constructor(id) {
    this.reset(id);
  }

  reset (id) {
    this.product_id = id;
    this.value = null;
    this.str = '';
    this.dirty = false;
    this.invalid = false;
    this.error_message = '';
  }

  set (value, str) {
    this.value = value;
    this.str = str;
    this.dirty = false;
    this.invalid = false;
    this.error_message = '';
  }

  setProd (id) {
    this.product_id = id;
  }

  isInvalid (scan_func) {
    // Return true if the string property is invalid using the scan function
    // supplied as an argument.  The scan functions are the functions below this
    // one.  The data is counted invalid only if it is also dirty.

    // For example, this.isInvalid(Validator.scanPrice);

    try {
      this.value = scan_func(this.str, this.product_id);
      return false;
    } catch (err) {
      this.error_message = err.message;
      this.value = null;
      return this.dirty;
    }
  }

  static scanPrice (str) {
    // Convert the price string to a float.

    let p = parseFloat(str);
    if (isNaN(p)) {
      throw new Error('Price must be a number');
    }

    return p;
  }

  static scanVolume (str) {
    // Scan a volume string and convert it to a number.  When no volume is
    // provided, a negative number is used to indicate that the order is for a
    // minimum market parcel.

    if (str === '') {
      // Negative number temporarily signifies minimum market parcel.  Before it
      // is sent to the server it will be converted to a true volume.

      return -1;
    } else {
      let v = parseFloat(str);

      // Make sure the volume is a positive number.

      if (isNaN(v) || v <= 0) {
        throw new Error('Volume must be a positive number or empty');
      }

      return v;
    }
  }

  static scanFwd (str, product_id = get(active_product)) {
    // Scan a string for 1 to 3 numbers.  The numbers can be in years or have an
    // optional 'm' suffix to represent months.
    const re = /^(?:[01]|\.){0,2}\d+[my]?$/gi;
    let years = str.match(re);
    let n = years?.length;

    if(!n || n > 1){
      throw new Error("Invalid forward");
    } else {
      years = years[0];
    }
    
    // Convert any months to years.
    let y = (years.slice(-1) === 'm' || years.slice(-1) === 'M') ? parseFloat(years) / 12 : parseFloat(years);

    if (product_id == 18) {
      let m = (years.slice(-1) === 'm' || years.slice(-1) === 'M') ? parseFloat(years) : parseFloat(years) * 12;
      if (m < 0 || m > 36 || !Number.isInteger(m)) {
        throw new Error (`${m} months is not valid. Please enter a value between 0 and 24.`);
      }
    } else if (y < 0.0833 || y >= 30) {
      throw new Error (`${+y.toFixed(4)} years is not valid. Refer to the indicator list.`);
    }
    
    // return the array
    return y;
  }

  static scanTenor (str, product_id = get(active_product)) {
    // Scan a string for 1 to 3 numbers.  The numbers can be in years or have an
    // optional 'm' suffix to represent months.

    if(product_id == 18 && str.includes('IR')) {return [0.25];} //EFPSPS tenor are always 0.25 (see prices store)
    
    let re;
    let years;
    if (product_id == 20) {
      re = /[a-zA-Z]{3}[0-9]{2}/gi;
      years = str.match(re);
      try {
        years = years.map((y) => rbaToYear(y).toString());
      } catch (e) {
        throw new Error('Please enter a valid tenor');
      }
    } else if (product_id == 17 || product_id == 27) {
      return [0.25];
    } else if (str.length <= 0){
      throw new Error('Please enter a valid tenor');
    } else {
      re = /(?:\.|\d)+[w|m|y]?/gi;
      years = str.match(re);
    }
    let n = years.length;
    
    // Make sure there are between 1 and 3 numbers

    if (n < 1 || n > 3) {
      throw new Error('Could not convert tenor to between 1 and 3 years');
    }

    // If the product is a fwd, ensure there is only one year given

    if (n > 1 && products.isFwd(product_id)) {
      throw new Error("Fwds currently only support outrights");
    }

    years = years.map(y =>
      (y.slice(-1) === 'm' || y.slice(-1) === 'M') ? parseFloat(y) / 12 : ((y.slice(-1) === 'w' || y.slice(-1) === 'W') ? parseFloat(y) / 52 :parseFloat(y))
    );

    // Make sure the years are in increasing order.

    if ((n > 1 && years[1] <= years[0]) || (n > 2 && years[2] <= years[1])) {
      throw new Error('The years must be in increasing order');
    }

    // Make sure the years exist in out indicator array.  Get the indicators for
    // the first product.

    if (product_id != 17 && product_id != 18 && product_id != 27) {
      for (let i = 0; i < n; i++) {
        // Quotes.get will raise an exception if years[i] is not valid.
        try {
          if (!quotes.isQuotedTenor(products.isFwd(product_id) ? products.nonFwd(product_id) : product_id, years[i])) throw new Error();
        } catch (e) {
          throw new Error (`${+years[i].toFixed(4)} years is not valid. Refer to the indicator list.`);
        }
      }
    }

    // There are special restrictions on EFPs.  No butterflys are allowed and
    // the only spreads are 3x10, 4x10 and 5x10. (Since updated: all spreads valid)

    if (product_id == 2 && n === 3) {
      throw new Error('EFP butterflys are not allowed');
    }

    // return the array

    return years;
  }

  static scanTenorShape (str) {

    // matches 3y || 3m || 3w || 3d || 3
    const regex = /(?:\d)+(d|w|m|y)?/gi;

    if(typeof str !== 'string') {
      throw new Error('Tenor is not of type string');
    }

    let matches = str.match(regex);

    if(matches === null) {
      throw new Error('Tenor unrecognized');
    }
    return matches[0];
  }

  static scanRequiredText (str) {
    // The string is the desired value.  It may not be empty.

    if (str === '') {
      throw new Error('Text field may not be empty');
    } else {
      return str;
    }
  }

  static scanNewPassword (str) {
    // Ensure string is not empty

    if (str === '') {
      throw new Error('Text field may not be empty');
    }

    // Ensure password length is at least 8 characters long

    if (str.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    /*
    Ensure password has at least:
     - one lowercase letter
     - one uppercase letter
     - one digit
     - one special character
    */

    // Declare functions for checking letters, digits, characters

    const isLetter = function (char) {
      return (/[a-zA-Z]/).test(char);
    };

    const isDigit = function (char) {
      return /^\d$/.test(char);
    };

    const isSpecialCharacter = function (char) {
      // List of valid password special characters as provided by OWASP

      const re = /[!"#$%&'()*+,-./:;<=>?@\\[\]^_`{|}~]/;
      return re.test(char);
    };

    let has_lower = false;
    let has_upper = false;
    let has_digit = false;
    let has_spec_char = false;
    for (let ch of str) {
      if (isDigit(ch)) {
        has_digit = true;
        continue;
      }

      if (isSpecialCharacter(ch)) {
        has_spec_char = true;
        continue;
      }

      if (isLetter(ch) && ch === ch.toLowerCase()) {
        has_lower = true;
        continue;
      }

      if (isLetter(ch) && ch === ch.toUpperCase()) {
        has_upper = true;
        continue;
      }

      // FIXME: Add the unrecognised character handler here
      // Once here, ch is disallowed character

      throw new Error('Disallowed character in password:', ch);
    }

    if (!has_lower) {
      throw new Error('Password must contain a lower case letter');
    }

    if (!has_upper) {
      throw new Error('Password must contain an upper case letter');
    }

    if (!has_digit) {
      throw new Error('Password must contain a digit');
    }

    if (!has_spec_char) {
      throw new Error('Password must contain a special character');
    }
  }

  static scanBBGID (str) {

    Validator.scanRequiredText(str);

    const parsedValue = Number(str);

    if(str == null || isNaN(parsedValue)) {
      throw new Error('Bloomberg Id must be an integer value');
    }
    return parsedValue;
  }

  static scanEmail (str) {

    // matches one or more string@string.string separated by a comma, a space or a comma followed by a space
    const regex = /^([^\s@]+@[^\s@]+\.[^\s@]+)([\s|","]+[^\s@]+@[^\s@]+\.[^\s@]+)*$/;

    if (str === '') {
      return str;
    }

    if (regex.test(str)) {
      return str;
    }

    throw new Error('Email must be a valid email');
  }

  static scanDate (str) {

    const pattern = /^\d{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])$/;

    if(!pattern.test(str)) {
      throw new Error('Date must be in the format of YYYY-mm-dd');
    }

    let date;
    try {
      date = new Date(str);
    } catch (err) {
      throw new Error('Date is not a valid date');
    }

    if(!isBusinessDay(date)) {
      throw new Error("Start Date cannot be set on a public holiday or weekend.");
    } else {
      return date;
    }
  }
}

export default Validator;
