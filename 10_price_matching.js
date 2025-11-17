describe('Price matching', function () {

  // Login and go to the 6v3 product at the start of the test.  Then add one
  // order so that the beforeEach function doesn't fail.

  before(function () {
    cy.visit('/');
    cy.login('mal', 'mal1');
    cy.xpath("//strong[text()='6v3']/../../../span[contains(@class, 'mdc-tab__ripple')]").click();
    cy.addOrder(true, true, [1], 1, 1);
  });

  // Remove all orders before each test

  beforeEach(function () {
    cy.orders();
    cy.removeAllOrders();
  });

  describe('New outrights', function () {

    describe('and existing outrights', function () {

      it('should generate spreads (increasing tenor)', function () {

        cy.priceMatch(
          { bid: true, firm: true, years: [3], price: 2.9, volume: -1 },
          [
            { bid: true, tenor: '3y', price: 2.9, bank: 'NAB', volume: 83.3 }
          ]
        );
        cy.numOrdersIs(1);

        cy.priceMatch(
          { bid: false, firm: true, years: [5], price: 5.1, volume: 100 },
          [
            { bid: false, tenor: '5y', price: 5.1, bank: 'NAB', volume: 100 },
            { bid: false, tenor: '3 x 5', price: 2.2, bank: 'POC', volume: 50.2 }
          ]
        );
        cy.numOrdersIs(2);
      });

      it('should generate spreads (decreasing tenor)', function () {

        cy.priceMatch(
          { bid: true, firm: true, years: [5], price: 4.9, volume: -1 },
          [
            { bid: true, tenor: '5y', price: 4.9, bank: 'NAB', volume: 50.2 }
          ]
        );
        cy.numOrdersIs(1);

        cy.priceMatch(
          { bid: false, firm: false, years: [3], price: 3.1, volume: 1 },
          [
            { bid: false, tenor: '3y', price: 3.1, bank: 'NAB', volume: 1 },
            { bid: true, tenor: '3 x 5', price: 1.8, bank: 'POC', volume: 0.6 }
          ]
        );
        cy.numOrdersIs(2);
      });

      it('should not generate spreads (same tenor)', function () {

        cy.priceMatch(
          { bid: true, firm: true, years: [3], price: 2.9, volume: 1 },
          [
            { bid: true, tenor: '3y', price: 2.9, bank: 'NAB', volume: 1 }
          ]
        );

        cy.priceMatch(
          { bid: false, firm: false, years: [3], price: 2.8, volume: 2 },
          [
            { bid: false, tenor: '3y', price: 2.8, bank: 'NAB', volume: 2 }
          ], 1
        );
      });

      it('should not generate spreads (same bid)', function () {

        cy.priceMatch(
          { bid: false, firm: true, years: [5], price: 5.1, volume: -1 },
          [
            { bid: false, tenor: '5y', price: 5.1, bank: 'NAB', volume: 50.2 }
          ]
        );

        cy.priceMatch(
          { bid: false, firm: false, years: [3], price: 3.1, volume: 10 },
          [
            { bid: false, tenor: '3y', price: 3.1, bank: 'NAB', volume: 10 }
          ], 2
        );
      });
    });

    describe('and two existing outrights', function () {

      it('make a butterfly (new outright is the body)', function () {

        cy.addOrder(true, true, [1], 0.98, 100);
        cy.addOrder(true, true, [10], 9.9, -1);

        cy.priceMatch(
          { bid: false, firm: false, years: [5], price: 5.2, volume: 20 },
          [
            { bid: true, tenor: '1y', price: 0.98, bank: 'NAB', volume: 100 },
            { bid: true, tenor: '10y', price: 9.9, bank: 'NAB', volume: 25.7 },
            { bid: false, tenor: '5y', price: 5.2, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '1x5x10', price: -0.48, bank: 'POC', volume: 20 },
            { bid: false, tenor: '1 x 5', price: 4.22, bank: 'POC', volume: 20 },
            { bid: true, tenor: '5 x 10', price: 4.7, bank: 'POC', volume: 10.2 }
          ]
        );
        cy.numOrdersIs(3);
      });

      it('make a butterfly (new outright is the body, different volumes)', function () {

        cy.addOrder(true, true, [1], 0.98, 100);
        cy.addOrder(true, true, [10], 9.9, -1);

        cy.priceMatch(
          { bid: false, firm: false, years: [5], price: 5.2, volume: 21 },
          [
            { bid: true, tenor: '1y', price: 0.98, bank: 'NAB', volume: 100 },
            { bid: true, tenor: '10y', price: 9.9, bank: 'NAB', volume: 25.7 },
            { bid: false, tenor: '5y', price: 5.2, bank: 'NAB', volume: 21 },
            { bid: false, tenor: '1x5x10', price: -0.48, bank: 'POC', volume: 21 },
            { bid: false, tenor: '1 x 5', price: 4.22, bank: 'POC', volume: 20.1 },
            { bid: true, tenor: '5 x 10', price: 4.7, bank: 'POC', volume: 10.7 }
          ]
        );
        cy.numOrdersIs(3);
      });

      it('make a butterfly (new outright is the upper leg)', function () {

        cy.addOrder(false, true, [1], 0.98, 150);
        cy.addOrder(true, true, [5], 5.2, 30);

        cy.priceMatch(
          { bid: false, firm: false, years: [10], price: 9.91, volume: 15 },
          [
            { bid: false, tenor: '1y', price: 0.98, bank: 'NAB', volume: 150 },
            { bid: true, tenor: '5y', price: 5.2, bank: 'NAB', volume: 30 },
            { bid: false, tenor: '10y', price: 9.91, bank: 'NAB', volume: 15 },
            { bid: true, tenor: '1x5x10', price: -0.49, bank: 'POC', volume: 30 },
            { bid: true, tenor: '1 x 5', price: 4.22, bank: 'POC', volume: 30 },
            { bid: false, tenor: '5 x 10', price: 4.71, bank: 'POC', volume: 15 }
          ]
        );
      });

      it('make a butterfly (new outright is the lower leg)', function () {

        cy.addOrder(false, true, [10], 9.91, 15);
        cy.addOrder(true, true, [5], 5.4, 30);

        cy.priceMatch(
          { bid: false, firm: false, years: [1], price: 0.99, volume: 145 },
          [
            { bid: false, tenor: '1y', price: 0.99, bank: 'NAB', volume: 145 },
            { bid: true, tenor: '5y', price: 5.4, bank: 'NAB', volume: 30 },
            { bid: false, tenor: '10y', price: 9.91, bank: 'NAB', volume: 15 },
            { bid: true, tenor: '1x5x10', price: -0.1, bank: 'POC', volume: 30 },
            { bid: true, tenor: '1 x 5', price: 4.41, bank: 'POC', volume: 29.1 },
            { bid: false, tenor: '5 x 10', price: 4.51, bank: 'POC', volume: 15 }
          ]
        );
      });

      it('do not make a butterfly (bid does not match)', function () {

        cy.addOrder(false, true, [1], 0.98, 100);
        cy.addOrder(true, true, [10], 9.9, -1);

        cy.priceMatch(
          { bid: false, firm: false, years: [5], price: 5.2, volume: 20 },
          [
            { bid: false, tenor: '1y', price: 0.98, bank: 'NAB', volume: 100 },
            { bid: true, tenor: '10y', price: 9.9, bank: 'NAB', volume: 25.7 },
            { bid: false, tenor: '5y', price: 5.2, bank: 'NAB', volume: 20 },
            { bid: true, tenor: '1 x 10', price: 8.92, bank: 'POC', volume: 10.3 },
            { bid: true, tenor: '5 x 10', price: 4.7, bank: 'POC', volume: 10.2 }
          ], 5
        );
      });

      it('do not make a butterfly (years are not different)', function () {

        cy.addOrder(false, true, [10], 9.91, 15);
        cy.addOrder(true, true, [5], 5.4, 30);

        cy.priceMatch(
          { bid: false, firm: false, years: [5], price: 4.9, volume: -1 },
          [
            { bid: false, tenor: '10y', price: 9.91, bank: 'NAB', volume: 15 },
            { bid: true, tenor: '5y', price: 5.4, bank: 'NAB', volume: 30 },
            { bid: false, tenor: '5y', price: 4.9, bank: 'NAB', volume: 50.2 },
            { bid: false, tenor: '5 x 10', price: 4.51, bank: 'POC', volume: 15 }
          ], 3
        );
      });

      it('do not make a butterfly (lower years are not different)', function () {

        cy.addOrder(false, true, [1], 1.1, 150);
        cy.addOrder(true, true, [1], 0.98, 30);

        cy.priceMatch(
          { bid: false, firm: true, years: [10], price: 10.2, volume: 15 },
          [
            { bid: false, tenor: '1y', price: 1.1, bank: 'NAB', volume: 150 },
            { bid: true, tenor: '1y', price: 0.98, bank: 'NAB', volume: 30 },
            { bid: false, tenor: '10y', price: 10.2, bank: 'NAB', volume: 15 },
            { bid: false, tenor: '1 x 10', price: 9.22, bank: 'POC', volume: 3.1 }
          ], 3
        );
      });
    });

    describe('and butterfly and other outright', function () {

      it('makes an outright (lower leg)', function () {

        cy.addOrder(true, true, [2, 5, 7], 0.9, -1);
        cy.addOrder(false, true, [5], 4.89, -1);

        cy.priceMatch(
          { bid: true, firm: false, years: [7], price: 7.2, volume: 20 },
          [
            { bid: true, tenor: '2x5x7', price: 0.9, bank: 'NAB', volume: 100.4 },
            { bid: false, tenor: '5y', price: 4.89, bank: 'NAB', volume: 50.2 },
            { bid: true, tenor: '7y', price: 7.2, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '2y', price: 1.68, bank: 'POC', volume: 62.5 }
          ]
        );
      });

      it('makes an outright (lower leg in reverse)', function () {
        cy.addOrder(false, true, [5], 4.89, -1);
        cy.addOrder(true, true, [2, 5, 7], 0.91, -1);

        cy.priceMatch(
          { bid: true, firm: false, years: [7], price: 7.2, volume: 20 },
          [
            { bid: true, tenor: '2x5x7', price: 0.91, bank: 'NAB', volume: 100.4 },
            { bid: false, tenor: '5y', price: 4.89, bank: 'NAB', volume: 50.2 },
            { bid: true, tenor: '7y', price: 7.2, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '2y', price: 1.67, bank: 'POC', volume: 62.5 }
          ]
        );
      });

      it('makes an outright (body)', function () {
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);
        cy.addOrder(true, true, [2], 1.48, 130);

        cy.priceMatch(
          { bid: true, firm: true, years: [7], price: 7.2, volume: 45 },
          [
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 },
            { bid: true, tenor: '2y', price: 1.48, bank: 'NAB', volume: 130 },
            { bid: true, tenor: '7y', price: 7.2, bank: 'NAB', volume: 45 },
            { bid: true, tenor: '5y', price: 4.785, bank: 'POC', volume: 100.4 }
          ]
        );
      });

      it('makes an outright (body in reverse)', function () {
        cy.addOrder(true, true, [2], 1.48, 130);
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);

        cy.priceMatch(
          { bid: true, firm: true, years: [7], price: 7.2, volume: 45 },
          [
            { bid: true, tenor: '2y', price: 1.48, bank: 'NAB', volume: 130 },
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 },
            { bid: true, tenor: '7y', price: 7.2, bank: 'NAB', volume: 45 },
            { bid: true, tenor: '5y', price: 4.785, bank: 'POC', volume: 100.4 }
          ]
        );
      });

      it('makes an outright (upper leg)', function () {
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);
        cy.addOrder(false, true, [5], 4.89, -1);

        cy.priceMatch(
          { bid: true, firm: true, years: [2], price: 1.48, volume: 20 },
          [
            { bid: true, tenor: '2y', price: 1.48, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '5y', price: 4.89, bank: 'NAB', volume: 50.2 },
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 },
            { bid: false, tenor: '7y', price: 7.41, bank: 'POC', volume: 5.8 }
          ]
        );
      });

      it('makes an outright (upper leg in reverse)', function () {
        cy.addOrder(false, true, [5], 4.89, -1);
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);

        cy.priceMatch(
          { bid: true, firm: true, years: [2], price: 1.48, volume: 20 },
          [
            { bid: true, tenor: '2y', price: 1.48, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '5y', price: 4.89, bank: 'NAB', volume: 50.2 },
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 },
            { bid: false, tenor: '7y', price: 7.41, bank: 'POC', volume: 5.8 }
          ]
        );
      });

      it('does not make an outright (lower outright tenor mismatch)', function () {
        cy.addOrder(false, true, [5], 4.89, -1);
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);

        cy.priceMatch(
          { bid: false, firm: true, years: [3], price: 1.48, volume: 20 },
          [
            { bid: false, tenor: '3y', price: 1.48, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '5y', price: 4.89, bank: 'NAB', volume: 50.2 },
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 }
          ], 3
        );
      });

      it('does not make an outright (lower tenor same as upper tenor)', function () {
        cy.addOrder(false, true, [5], 4.89, -1);
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);

        cy.priceMatch(
          { bid: true, firm: true, years: [5], price: 1.48, volume: 20 },
          [
            { bid: true, tenor: '5y', price: 1.48, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '5y', price: 4.89, bank: 'NAB', volume: 50.2 },
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 }
          ], 2
        );
      });

      it('does not make an outright (lower leg bid mismatch)', function () {
        cy.addOrder(false, true, [5], 4.89, -1);
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);

        cy.priceMatch(
          { bid: false, firm: true, years: [2], price: 1.48, volume: 20 },
          [
            { bid: false, tenor: '2y', price: 1.48, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '5y', price: 4.89, bank: 'NAB', volume: 50.2 },
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 }
          ], 3
        );
      });

      it('does not make an outright (middle leg bid mismatch)', function () {
        cy.addOrder(true, true, [5], 4.89, -1);
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);

        cy.priceMatch(
          { bid: true, firm: true, years: [2], price: 1.48, volume: 20 },
          [
            { bid: true, tenor: '2y', price: 1.48, bank: 'NAB', volume: 20 },
            { bid: true, tenor: '5y', price: 4.89, bank: 'NAB', volume: 50.2 },
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 }
          ], 3
        );
      });

      it('does not make an outright (upper leg bid mismatch)', function () {
        cy.addOrder(false, true, [7], 4.89, -1);
        cy.addOrder(true, true, [2, 5, 7], 0.89, -1);

        cy.priceMatch(
          { bid: true, firm: true, years: [2], price: 1.48, volume: 20 },
          [
            { bid: true, tenor: '2y', price: 1.48, bank: 'NAB', volume: 20 },
            { bid: false, tenor: '7y', price: 4.89, bank: 'NAB', volume: 36.1 },
            { bid: false, tenor: '2 x 7', price: 3.41, bank: 'POC', volume: 5.8 },
            { bid: true, tenor: '2x5x7', price: 0.89, bank: 'NAB', volume: 100.4 }
          ], 4
        );
      });
    });

    describe('and existing spreads', function () {
      it('should generate outrights (on upper leg)', function () {
        cy.addOrder(true, true, [0.25, 4], 3.65, 100);

        cy.priceMatch(
          { bid: true, firm: false, years: [0.25], price: 0.25, volume: 141 },
          [
            { bid: true, tenor: '3m', price: 0.25, bank: 'NAB', volume: 141 },
            { bid: true, tenor: '3m x 4', price: 3.65, bank: 'NAB', volume: 100 },
            { bid: true, tenor: '4y', price: 3.9, bank: 'POC', volume: 8.1 }
          ]
        );
      });

      it('should generate spreads (on lower leg)', function () {
        cy.addOrder(false, true, [0.25, 4], 3.65, -1);

        cy.priceMatch(
          { bid: true, firm: false, years: [4], price: 3.9, volume: 141 },
          [
            { bid: true, tenor: '4y', price: 3.9, bank: 'NAB', volume: 141 },
            { bid: false, tenor: '3m x 4', price: 3.65, bank: 'NAB', volume: 62.6 },
            { bid: true, tenor: '3m', price: 0.25, bank: 'POC', volume: 1087.0 }
          ]
        );
      });

      it('should not generate spreads (different tenor)', function () {
        cy.addOrder(true, true, [0.5, 4], 3.65, 100);

        cy.priceMatch(
          { bid: true, firm: false, years: [0.25], price: 0.25, volume: 141 },
          [
            { bid: true, tenor: '3m', price: 0.25, bank: 'NAB', volume: 141 },
            { bid: true, tenor: '6m x 4', price: 3.65, bank: 'NAB', volume: 100 }
          ], 2
        );
      });

      it('should not generate spreads (same bid on upper leg)', function () {
        cy.addOrder(false, true, [0.25, 4], 3.65, 100);

        cy.priceMatch(
          { bid: false, firm: false, years: [4], price: 0.25, volume: 141 },
          [
            { bid: false, tenor: '4y', price: 0.25, bank: 'NAB', volume: 141 },
            { bid: false, tenor: '3m x 4', price: 3.65, bank: 'NAB', volume: 100 }
          ], 2
        );
      });

      it('should not generate spreads (same bid on lower leg)', function () {
        cy.addOrder(false, true, [0.25, 4], 3.65, 100);

        cy.priceMatch(
          { bid: true, firm: false, years: [0.25], price: 0.25, volume: 141 },
          [
            { bid: true, tenor: '3m', price: 0.25, bank: 'NAB', volume: 141 },
            { bid: false, tenor: '3m x 4', price: 3.65, bank: 'NAB', volume: 100 }
          ], 2
        );
      });
    });

  });

  describe('New spreads', function () {

    describe('and existing outrights', function () {
      it('should generate outrights (on upper leg)', function () {
        cy.addOrder(true, false, [0.25], 0.25, 141);

        cy.priceMatch(
          { bid: true, firm: true, years: [0.25, 4], price: 3.65, volume: 100 },
          [
            { bid: true, tenor: '3m', price: 0.25, bank: 'NAB', volume: 141 },
            { bid: true, tenor: '3m x 4', price: 3.65, bank: 'NAB', volume: 100 },
            { bid: true, tenor: '4y', price: 3.9, bank: 'POC', volume: 8.1 }
          ], 3
        );
      });

      it('should generate spreads (on lower leg)', function () {
        cy.addOrder(true, true, [4], 3.9, 141);

        cy.priceMatch(
          { bid: false, firm: true, years: [0.25, 4], price: 3.65, volume: -1 },
          [
            { bid: true, tenor: '4y', price: 3.9, bank: 'NAB', volume: 141 },
            { bid: false, tenor: '3m x 4', price: 3.65, bank: 'NAB', volume: 62.6 },
            { bid: true, tenor: '3m', price: 0.25, bank: 'POC', volume: 1087 },
          ], 3
        );
      });

      it('should not generate spreads (different tenor)', function () {
        cy.addOrder(true, false, [0.25], 0.25, 141);

        cy.priceMatch(
          { bid: true, firm: true, years: [0.5, 4], price: 3.65, volume: 100 },
          [
            { bid: true, tenor: '3m', price: 0.25, bank: 'NAB', volume: 141 },
            { bid: true, tenor: '6m x 4', price: 3.65, bank: 'NAB', volume: 100 }
          ], 2
        );
      });

      it('should not generate spreads (same bid on upper leg)', function () {
        cy.addOrder(true, false, [0.25], 0.25, 141);

        cy.priceMatch(
          { bid: false, firm: true, years: [0.25, 4], price: 3.65, volume: 100 },
          [
            { bid: true, tenor: '3m', price: 0.25, bank: 'NAB', volume: 141 },
            { bid: false, tenor: '3m x 4', price: 3.65, bank: 'NAB', volume: 100 }
          ], 2
        );
      });

      it('should not generate spreads (same bid on lower leg)', function () {
        cy.addOrder(true, false, [4], 3.9, 141);

        cy.priceMatch(
          { bid: true, firm: true, years: [0.25, 4], price: 3.65, volume: -1 },
          [
            { bid: true, tenor: '4y', price: 3.9, bank: 'NAB', volume: 141 },
            { bid: true, tenor: '3m x 4', price: 3.65, bank: 'NAB', volume: 62.6 }
          ], 2
        );
      });
    });

    describe('and existing spreads', function () {

      it('should generate butterflys (bids are opposite)', function () {
        cy.addOrder(true, true, [4, 7], 2.8, 141);
        cy.priceMatch(
          { bid: false, firm: true, years: [7, 10], price: 3.2, volume: 100 },
          [
            { bid: true, tenor: '4 x 7', price: 2.8, bank: 'NAB', volume: 141 },
            { bid: false, tenor: '7 x 10', price: 3.2, bank: 'NAB', volume: 100 },
            { bid: true, tenor: '4x7x10', price: -0.4, bank: 'POC', volume: 281.4 }
          ], 3
        );
      });

      it('should generate butterflys (bids are opposite and reversed)', function () {
        cy.addOrder(true, true, [7, 10], 2.8, 100);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7], price: 3.2, volume: 141 },
          [
            { bid: false, tenor: '4 x 7', price: 3.2, bank: 'NAB', volume: 141 },
            { bid: true, tenor: '7 x 10', price: 2.8, bank: 'NAB', volume: 100 },
            { bid: false, tenor: '4x7x10', price: 0.4, bank: 'POC', volume: 281.4 }
          ], 3
        );
      });

      it('should not generate butterflys (lower legs have same bid)', function () {
        cy.addOrder(true, true, [4, 7], 2.8, 141);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 10], price: 5.8, volume: 100 },
          [], 2
        );
      });

      it('should not generate butterflys (upper legs have same bid)', function () {
        cy.addOrder(false, true, [4, 10], 2.8, 141);
        cy.priceMatch(
          { bid: false, firm: true, years: [7, 10], price: 2.8, volume: 100 },
          [], 2
        );
      });

      it('should not generate butterflys (legs are not common)', function () {
        cy.addOrder(true, true, [4, 7], 2.8, 141);
        cy.priceMatch(
          { bid: false, firm: true, years: [6, 10], price: 5.8, volume: 100 },
          [], 2
        );
      });

      it('should generate spreads (bids are same)', function () {
        cy.addOrder(true, true, [4, 7], 2.8, -1);
        cy.priceMatch(
          { bid: true, firm: true, years: [7, 10], price: 2.9, volume: 50 },
          [
            { bid: true, tenor: '4 x 10', price: 5.7, bank: 'POC', volume: 25.7 }
          ], 3
        );
      });

      it('should generate spreads (lower legs are same)', function () {
        cy.addOrder(false, true, [4, 7], 3.1, -1);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 10], price: 5.8, volume: 50 },
          [
            { bid: true, tenor: '7 x 10', price: 2.7, bank: 'POC', volume: 25.7 }
          ], 3
        );
      });

      it('should generate spreads (lower legs are same with reversed order)', function () {
        cy.addOrder(false, true, [4, 12], 8.1, -1);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 10], price: 5.8, volume: 50 },
          [
            { bid: false, tenor: '10 x 12', price: 2.3, bank: 'POC', volume: 21.7 }
          ], 3
        );
      });

      it('should generate spreads (upper legs are same)', function () {
        cy.addOrder(true, true, [4, 10], 5.9, -1);
        cy.priceMatch(
          { bid: false, firm: true, years: [7, 10], price: 3.1, volume: 50 },
          [
            { bid: true, tenor: '4 x 7', price: 2.8, bank: 'POC', volume: 36.1 }
          ], 3
        );
      });

      it('should generate spreads (upper legs are same with reversed order)', function () {
        cy.addOrder(true, true, [4, 10], 5.9, 30);
        cy.priceMatch(
          { bid: false, firm: true, years: [2, 10], price: 8.1, volume: 50 },
          [
            { bid: false, tenor: '2 x 4', price: 2.2, bank: 'POC', volume: 73.2 }
          ], 3
        );
      });

      it('make a butterfly with no circular prices', function () {
        cy.addOrder(false, true, [1, 3], 2.1, -1);
        cy.addOrder(true, true, [1, 3], 1.9, -1);
        cy.priceMatch(
          { bid: false, firm: true, years: [3, 5], price: 2.2, volume: -1 },
          [
            { bid: true, tenor: '1x3x5', price: -0.3, bank: 'POC', volume: 166.6 },
            { bid: false, tenor: '1 x 5', price: 4.3, bank: 'POC', volume: 50.2 }
          ], 4
        );
      });

    });

    describe('and existing butterflys', function () {

      it('should generate spreads (lower spread)', function () {
        cy.addOrder(true, false, [4, 7, 11], -1.2, 100);
        cy.priceMatch(
          { bid: true, firm: true, years: [7, 11], price: 3.9, volume: 70 },
          [
            { bid: true, tenor: '4 x 7', price: 2.7, bank: 'POC', volume: 50 }
          ], 3
        );
      });

      it('should generate spreads (upper spread)', function () {
        cy.addOrder(true, false, [4, 7, 11], -1.2, 100);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7], price: 3.1, volume: 45 },
          [
            { bid: false, tenor: '7 x 11', price: 4.3, bank: 'POC', volume: 29.3 }
          ], 3
        );
      });

      it('should not generate spreads (mismatched bids)', function () {
        cy.addOrder(true, false, [4, 7, 11], -1.2, 100);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 7], price: 3.1, volume: 45 },
          [], 2
        );
      });

      it('should not generate spreads (mismatched legs)', function () {
        cy.addOrder(true, false, [4, 7, 11], -1.2, 100);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 8], price: 3.1, volume: 45 },
          [], 2
        );
      });
    });

  });

  describe('New butterflys', function () {

    describe('and existing spreads', function () {

      it('should generate spreads (lower spread)', function () {
        cy.addOrder(true, true, [7, 11], 4.15, 100);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 7, 11], price: -1.2, volume: -1 },
          [
            { bid: true, tenor: '4 x 7', price: 2.95, bank: 'POC', volume: 36.1 }
          ], 3
        );
      });

      it('should generate spreads (upper spread)', function () {
        cy.addOrder(false, true, [4, 7], 2.95, 100);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 7, 11], price: -1.2, volume: -1 },
          [
            { bid: false, tenor: '7 x 11', price: 4.15, bank: 'POC', volume: 23.5 }
          ], 3
        );
      });

      it('should not generate spreads (mismatched bids)', function () {
        cy.addOrder(false, true, [4, 7], 2.95, 100);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7, 11], price: -1.2, volume: -1 },
          [], 2
        );
      });

      it('should not generate spreads (mismatched legs)', function () {
        cy.addOrder(false, true, [4, 8], 2.95, 100);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 7, 11], price: -1.2, volume: -1 },
          [], 2
        );
      });

      it('should generate butterflys from spreads (lower wing)', function () {
        cy.addOrder(false, true, [4, 5], 1.1, 100);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 7, 11], price: -1.2, volume: -1 },
          [
            { bid: true, tenor: '5x7x11', price: -2.3, bank: 'POC', volume: 72.2 }
          ], 3
        );
      });

      it('should generate butterflys from spreads (body)', function () {
        cy.addOrder(false, true, [5, 7], 2.1, 60);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 7, 11], price: -1.2, volume: -1 },
          [
            { bid: true, tenor: '4x5x11', price: -5.4, bank: 'POC', volume: 83.4 }
          ], 3
        );
      });

      it('should generate butterflys from spreads (upper wing)', function () {
        cy.addOrder(false, true, [11, 12], 1.1, 10);
        cy.priceMatch(
          { bid: true, firm: true, years: [4, 7, 11], price: -1.2, volume: -1 },
          [
            { bid: true, tenor: '4x7x12', price: -2.3, bank: 'POC', volume: 33.3 }
          ], 3
        );
      });
    });

    describe('and existing butterflys', function () {

      it('should generate spreads (lower wing)', function () {
        cy.addOrder(true, true, [5, 7, 11], -2.2, 46);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7, 11], price: -0.9, volume: -1 },
          [
            { bid: false, tenor: '4 x 5', price: 1.3, bank: 'POC', volume: 32 }
          ], 3
        );
      });

      it('should generate spreads (body)', function () {
        cy.addOrder(true, true, [4, 5, 11], -5.2, 55);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7, 11], price: -0.9, volume: 70 },
          [
            { bid: false, tenor: '5 x 7', price: 2.15, bank: 'POC', volume: 39.5 }
          ], 3
        );
      });

      it('should generate spreads (upper wing)', function () {
        cy.addOrder(true, true, [4, 7, 12], -2.2, 55);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7, 11], price: -0.9, volume: 50 },
          [
            { bid: false, tenor: '11 x 12', price: 1.3, bank: 'POC', volume: 15 }
          ], 3
        );
      });

      it('should not generate spreads (mismatched bid on lower wing)', function () {
        cy.addOrder(false, true, [5, 7, 11], -2.2, 46);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7, 11], price: -0.9, volume: -1 },
          [], 2
        );
      });

      it('should generate spreads (mismatched bid on body)', function () {
        cy.addOrder(false, true, [4, 5, 11], -5.2, 55);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7, 11], price: -0.9, volume: 70 },
          [], 2
        );
      });

      it('should generate spreads (mismatched tenor)', function () {
        cy.addOrder(true, true, [5, 7, 12], -2.2, 55);
        cy.priceMatch(
          { bid: false, firm: true, years: [4, 7, 11], price: -0.9, volume: 50 },
          [], 2
        );
      });
    });

    describe('and two existing outrights', function () {

      it('make an outright (lower wing)', function () {
        cy.addOrder(false, true, [10], 10.2, 15);
        cy.addOrder(true, true, [5], 4.8, 30);
        cy.priceMatch(
          { bid: false, firm: true, years: [1, 5, 10], price: -0.9, volume: 29 },
          [
            { bid: true, tenor: '1y', price: 0.3, bank: 'POC', volume: 72.2 }
          ], 5
        );
      });

      it('make an outright (body)', function () {
        cy.addOrder(false, true, [1], 1.1, 70);
        cy.addOrder(false, true, [10], 9.6, 7);
        cy.priceMatch(
          { bid: false, firm: true, years: [1, 5, 10], price: -0.9, volume: 29 },
          [
            { bid: false, tenor: '5y', price: 4.9, bank: 'POC', volume: 27.4 }
          ], 4
        );
      });

      it('make an outright (upper wing)', function () {
        cy.addOrder(false, true, [1], 1.1, 70);
        cy.addOrder(true, true, [5], 4.9, 30);
        cy.priceMatch(
          { bid: false, firm: true, years: [1, 5, 10], price: -0.9, volume: 29 },
          [
            { bid: true, tenor: '10y', price: 9.6, bank: 'POC', volume: 7.2 }
          ], 5
        );
      });

      it('do not make an outright (lower bid does not match)', function () {
        cy.addOrder(true, true, [10], 10.2, 15);
        cy.addOrder(true, true, [5], 4.8, 30);
        cy.priceMatch(
          { bid: false, firm: true, years: [1, 5, 10], price: -0.9, volume: 29 },
          [], 3
        );
      });

      it('do not make an outright (upper bid does not match)', function () {
        cy.addOrder(true, true, [1], 1.1, 70);
        cy.addOrder(true, true, [5], 4.9, 30);
        cy.priceMatch(
          { bid: false, firm: true, years: [1, 5, 10], price: -0.9, volume: 29 },
          [], 3
        );
      });

      it('do not make an outright (upper years are different)', function () {
        cy.addOrder(false, true, [1], 1.1, 70);
        cy.addOrder(false, true, [11], 9.6, 7);
        cy.priceMatch(
          { bid: false, firm: true, years: [1, 5, 10], price: -0.9, volume: 29 },
          [], 3
        );
      });

      it('do not make an outright (lower years are different)', function () {
        cy.addOrder(false, true, [0.75], 1.1, 70);
        cy.addOrder(false, true, [10], 9.6, 7);
        cy.priceMatch(
          { bid: false, firm: true, years: [1, 5, 10], price: -0.9, volume: 29 },
          [], 3
        );
      });
    });

  });
});
