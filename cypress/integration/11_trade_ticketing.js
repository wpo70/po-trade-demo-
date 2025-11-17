// This test module relies heavily on price matching functionality.
// It is important that the '10_price_matching.js' tests pass successfully
// before running these tests.

/*
Order Template:
{ bank: '', bid: , firm: , years: [], price: , volume: }

Trade Details Template
{ tnr: '', rec: '', pay: '', prc: '', vol: '', bro_rec: '', bro_pay: '', cur: 'AUD' }

The tests were run with the following details (IRS mid [for bro calcs 'rate'], Dv01 [for volume calcs]):

Tenor | IRS Mid | 6v3 Mid |  DV01
1y      0.0525     1.375     1.000
2y      0.1575     1.750     1.999
3y      0.3250     2.125     2.999
4y      0.5738     2.375     3.981
5y      0.7938     2.500     4.951
6y      1.0013     2.375     5.903
7y      1.1863     2.375     6.836
8y      1.3438     2.375     7.748
9y      1.4750     2.375     8.630
10y     1.5838     2.375     9.489
11y     1.6925     2.475     10.330
12y     1.7625     2.500     11.145
13y     1.7875     3.000     11.941
14y     1.8800     3.125     12.720
15y     1.9463     3.375     13.471
20y     2.0788     4.500     16.992
25y     2.0988     5.625     20.159
30y     2.0800     6.750     23.055

Fees (for bro calcs):
bank    fee
CBA     0.02
WBC     0.03
NAB     0.04
JPM     0.05
ANZ     0.06
BARC    0.07
*/

describe('Trade ticketing', function () {

  // Login and go to the 6v3 product at the start of the test.  Then add one
  // order so that the beforeEach function doesn't fail.

  before(function () {
    cy.visit('/');
    cy.login('adam', 'adam1');
    cy.xpath("//strong[text()='6v3']/../../../span[contains(@class, 'mdc-tab__ripple')]").click();
    cy.addOrder(true, true, [1], 1, 1);
  });

  // Close trade dialog and remove all orders before each test

  beforeEach(function () {
    cy.closeDialog();
    cy.orders();
    cy.removeAllOrders();
  });

  describe('Outright', function () {

    describe('against outright (matching tenor)', function () {

      describe('without matching prices', function () {

        it('should not be tradeable', function () {

          cy.verifyUntradeable(
            [
              { bank: 'CBA', bid: false, firm: true, years: [1], price: 0.98, volume: 250 },
              { bank: 'NAB', bid: true, firm: true, years: [1], price: 1.0, volume: 250 }
            ],
            '1y'
          );

        });
      });

      describe('with matching prices', function () {

        describe('and same volumes', function () {

          it('should be tradeable with correct values', function () {

            cy.verifyTrade(
              [
                { bank: 'CBA', bid: false, firm: true, years: [1], price: 1.38, volume: 250 },
                { bank: 'WBC', bid: true, firm: true, years: [1], price: 1.38, volume: 250 }
              ],
              '1y',
              [
                { tnr: '1y', rec: 'CBA', pay: 'WBC', prc: '1.3800', vol: '250.0', bro_rec: '499.84', bro_pay: '749.75', cur: 'AUD' }
              ],
            );

          });
        });
      });

      describe('and volume receiver > volume payer', function () {

        it('should be tradeable with correct values and min volume', function () {

          cy.verifyTrade(
            [
              { bank: 'CBA', bid: false, firm: true, years: [1], price: 1.38, volume: 250 },
              { bank: 'WBC', bid: true, firm: true, years: [1], price: 1.38, volume: 150 }
            ],
            '1y',
            [
              { tnr: '1y', rec: 'CBA', pay: 'WBC', prc: '1.3800', vol: '150.0', bro_rec: '299.90', bro_pay: '449.85', cur: 'AUD' }
            ],
          );

        });
      });

      describe('and volume receiver < volume payer', function () {

        it('should be tradeable with correct values and min volume', function () {

          cy.verifyTrade(
            [
              { bank: 'CBA', bid: false, firm: true, years: [1], price: 1.38, volume: 150 },
              { bank: 'WBC', bid: true, firm: true, years: [1], price: 1.38, volume: 250 }
            ],
            '1y',
            [
              { tnr: '1y', rec: 'CBA', pay: 'WBC', prc: '1.3800', vol: '150.0', bro_rec: '299.90', bro_pay: '449.85', cur: 'AUD' }
            ],
          );

        });
      });
    });
  });

  describe('Outrights', function () {

    describe('against spread', function () {

      describe('without matching prices', function () {

        it('should not be tradeable', function () {

          cy.verifyUntradeable(
            [
              { bank: 'CBA', bid: false, firm: true, years: [3, 5], price: 1.9, volume: 200 },
              { bank: 'WBC', bid: false, firm: true, years: [3], price: 3.5, volume: 200 },
              { bank: 'NAB', bid: true, firm: true, years: [5], price: 4.5, volume: 200 }
            ],
            '3 x 5'
          );

        });
      });

      describe('with matching prices', function () {

        describe('spread offer with matching outrights', function () {

          it('should be tradeable with correct values', function () {

            cy.verifyTrade(
              [
                { bank: 'CBA', bid: false, firm: true, years: [3, 5], price: 0.3625, volume: 200 },
                { bank: 'WBC', bid: false, firm: true, years: [3], price: 2.1350, volume: 200 },
                { bank: 'NAB', bid: true, firm: true, years: [5], price: 2.4975, volume: 100 }
              ],
              '3 x 5',
              [
                { tnr: '3y', rec: 'WBC', pay: 'CBA', prc: '2.1350', vol: '165.0', bro_rec: '1477.19', bro_pay: null, cur: 'AUD' },
                { tnr: '5y', rec: 'CBA', pay: 'NAB', prc: '2.4975', vol: '100.0', bro_rec: '978.51', bro_pay: '1957.03', cur: 'AUD' }
              ],
            );

          });
        });

        describe('spread bid with matching outrights', function () {

          it('should be tradeable with correct values', function () {

            cy.verifyTrade(
              [
                { bank: 'CBA', bid: true, firm: true, years: [3, 5], price: 0.3625, volume: 200 },
                { bank: 'WBC', bid: true, firm: true, years: [3], price: 2.1350, volume: 200 },
                { bank: 'NAB', bid: false, firm: true, years: [5], price: 2.4975, volume: 200 }
              ],
              '3 x 5',
              [
                { tnr: '3y', rec: 'CBA', pay: 'WBC', prc: '2.1350', vol: '200.0', bro_rec: null, bro_pay: '1790.53', cur: 'AUD' },
                { tnr: '5y', rec: 'NAB', pay: 'CBA', prc: '2.4975', vol: '121.0', bro_rec: '2368.00', bro_pay: '1184.00', cur: 'AUD' }
              ],
            );

          });
        });
      });
    });

    describe('against fly', function () {

      describe('without matching prices', function () {

        it('should not be tradeable', function () {

          cy.verifyUntradeable(
            [
              { bank: 'CBA', bid: false, firm: true, years: [3, 5, 10], price: -2.8, volume: 100 },
              { bank: 'WBC', bid: false, firm: true, years: [3], price: 4.5, volume: 200 },
              { bank: 'NAB', bid: true, firm: true, years: [5], price: 9.5, volume: 150 },
              { bank: 'JPM', bid: false, firm: true, years: [10], price: 2.5, volume: 90 }
            ],
            '3x5x10',
          );

        });
      });

      describe('with matching prices', function () {

        describe('fly offer with matching outrights', function () {

          it('should be tradeable', function () {

            cy.verifyTrade(
              [
                { bank: 'CBA', bid: false, firm: true, years: [3, 5, 10], price: 0.5050, volume: 500 },
                { bank: 'WBC', bid: false, firm: true, years: [3], price: 2.1500, volume: 200 },
                { bank: 'NAB', bid: true, firm: true, years: [5], price: 2.5100, volume: 150 },
                { bank: 'JPM', bid: false, firm: true, years: [10], price: 2.3650, volume: 90 }
              ],
              '3x5x10',
              [
                { tnr: '3y', rec: 'WBC', pay: 'CBA', prc: '2.1500', vol: '124.0', bro_rec: '1110.13', bro_pay: null, cur: 'AUD' },
                { tnr: '5y', rec: 'CBA', pay: 'NAB', prc: '2.5100', vol: '150.0', bro_rec: '1467.77', bro_pay: '2935.54', cur: 'AUD' },
                { tnr: '10y', rec: 'JPM', pay: 'CBA', prc: '2.3650', vol: '39.0', bro_rec: '1796.86', bro_pay: null, cur: 'AUD' }
              ],
            );

          })
        })

        describe('fly bid with matching outrights', function () {

          it('should be tradeable', function () {

            cy.verifyTrade(
              [
                { bank: 'CBA', bid: true, firm: true, years: [1, 2, 3], price: -0.01, volume: 150 },
                { bank: 'WBC', bid: true, firm: true, years: [1], price: 1.38, volume: 300 },
                { bank: 'NAB', bid: false, firm: true, years: [2], price: 1.745, volume: 150 },
                { bank: 'JPM', bid: true, firm: true, years: [3], price: 2.12, volume: 200 }
              ],
              '1x2x3',
              [
                { tnr: '1y', rec: 'CBA', pay: 'WBC', prc: '1.3800', vol: '150.0', bro_rec: null, bro_pay: '449.85', cur: 'AUD' },
                { tnr: '2y', rec: 'NAB', pay: 'CBA', prc: '1.7450', vol: '150.0', bro_rec: '1197.88', bro_pay: '598.94', cur: 'AUD' },
                { tnr: '3y', rec: 'CBA', pay: 'JPM', prc: '2.1200', vol: '50.0', bro_rec: null, bro_pay: '746.05', cur: 'AUD' }
              ],
            );

          });
        });
      });
    });
  });

  describe('Spread', function () {

    describe('against spread (matching tenors)', function () {

      describe('without matching prices', function () {

        it('should not be tradeable', function () {

          cy.verifyUntradeable(
            [
              { bank: 'CBA', bid: false, firm: true, years: [5, 10], price: 4.9, volume: 200 },
              { bank: 'WBC', bid: true, firm: true, years: [5, 10], price: 5.1, volume: 175 }
            ],
            '5 x 10'
          );

        });
      });

      describe('with matching prices', function () {

        it('should be tradeable', function () {

          cy.verifyTrade(
            [
              { bank: 'CBA', bid: false, firm: true, years: [5, 10], price: -0.12, volume: 200 },
              { bank: 'WBC', bid: true, firm: true, years: [5, 10], price: -0.12, volume: 175 }
            ],
            '5 x 10',
            [
              { tnr: '5y', rec: 'WBC', pay: 'CBA', prc: '2.5000', vol: '335.5', bro_rec: null, bro_pay: null, cur: 'AUD' },
              { tnr: '10y', rec: 'CBA', pay: 'WBC', prc: '2.3800', vol: '175.0', bro_rec: '3225.14', bro_pay: '4837.70', cur: 'AUD' }
            ],
          );

        });
      });
    });
  });

  describe('Fly', function () {

    describe('against fly (with same tenor)', function () {

      describe('without matching prices', function () {

        it('should not be tradeable', function () {

          cy.verifyUntradeable(
            [
              { bank: 'CBA', bid: false, firm: true, years: [3, 10, 15], price: 2.1, volume: 500 },
              { bank: 'WBC', bid: true, firm: true, years: [3, 10, 15], price: 1.95, volume: 375 }
            ],
            '3x10x15'
          );

        });
      });

      describe('with matching prices', function () {

        it('should be tradeable', function () {

          cy.verifyTrade(
            [
              { bank: 'CBA', bid: false, firm: true, years: [3, 10, 15], price: -0.775, volume: 500 },
              { bank: 'WBC', bid: true, firm: true, years: [3, 10, 15], price: -0.775, volume: 375 }
            ],
            '3x10x15',
            [
              { tnr: '3y', rec: 'WBC', pay: 'CBA', prc: '2.1250', vol: '593.5', bro_rec: null, bro_pay: null, cur: 'AUD' },
              { tnr: '10y', rec: 'CBA', pay: 'WBC', prc: '2.3625', vol: '375.0', bro_rec: '6911.01', bro_pay: '10366.51', cur: 'AUD' },
              { tnr: '15y', rec: 'WBC', pay: 'CBA', prc: '3.3750', vol: '132.0', bro_rec: null, bro_pay: null, cur: 'AUD' }
            ],
          );

        });
      });
    });
  });

  describe('A Spread derived from two spread orders', function () {

    describe('against another spread (matching prices)', function () {

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: false, firm: true, years: [3, 5], price: 0.3800, volume: 51 },
            { bank: 'WBC', bid: false, firm: true, years: [5, 7], price: -0.1275, volume: 37 },
            { bank: 'NAB', bid: true, firm: true, years: [3, 7], price: 0.2525, volume: 37 }
          ],
          '3 x 7',
          [
            { tnr: '3y', rec: 'NAB', pay: 'CBA', prc: '2.1250', vol: '84.0', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '5y', rec: 'CBA', pay: 'WBC', prc: '2.5050', vol: '51.0', bro_rec: '499.04', bro_pay: null, cur: 'AUD' },
            { tnr: '7y', rec: 'WBC', pay: 'NAB', prc: '2.3775', vol: '37.0', bro_rec: '743.50', bro_pay: '991.33', cur: 'AUD' }
          ],
        );

      });
    });
  });

  describe('A fly derived from two spread orders', function () {

    describe('against a fly order (matching prices)', function (){

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: false, firm: true, years: [3, 5], price: 0.3800, volume: 51 },
            { bank: 'WBC', bid: true, firm: true, years: [5, 7], price: -0.1245, volume: 37 },
            { bank: 'NAB', bid: true, firm: true, years: [3, 5, 7], price: 0.5045, volume: 101 }
          ],
          '3x5x7',
          [
            { tnr: '3y', rec: 'NAB', pay: 'CBA', prc: '2.1250', vol: '83.5', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '5y', rec: 'WBC', pay: 'NAB', prc: '2.5050', vol: '50.5', bro_rec: null, bro_pay: '1976.60', cur: 'AUD' },
            { tnr: '5y', rec: 'CBA', pay: 'NAB', prc: '2.5050', vol: '50.5', bro_rec: '494.15', bro_pay: null, cur: 'AUD' },
            { tnr: '7y', rec: 'NAB', pay: 'WBC', prc: '2.3805', vol: '36.5', bro_rec: null, bro_pay: '733.45', cur: 'AUD' }
          ]
        );

      });
    });
  });

  describe('A spread derived from a spread and fly order', function () {

    describe('against a spread order (matching prices)', function () {

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: true, firm: true, years: [5, 10], price: -0.13, volume: 27 },
            { bank: 'WBC', bid: false, firm: true, years: [5, 10, 15], price: -1.12, volume: 53 },
            { bank: 'NAB', bid: false, firm: true, years: [10, 15], price: 0.99, volume: 19 }
          ],
          '5x10x15',
          [
            { tnr: '5y', rec: 'CBA', pay: 'WBC', prc: '2.5000', vol: '51.0', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '10y', rec: 'WBC', pay: 'NAB', prc: '2.3700', vol: '26.5', bro_rec: '1465.13', bro_pay: null, cur: 'AUD' },
            { tnr: '10y', rec: 'WBC', pay: 'CBA', prc: '2.3700', vol: '26.5', bro_rec: null, bro_pay: '488.38', cur: 'AUD' },
            { tnr: '15y', rec: 'NAB', pay: 'WBC', prc: '3.3600', vol: '18.5', bro_rec: '958.64', bro_pay: null, cur: 'AUD' }
          ]
        );

      });
    });
  });

  describe('A spread derived from two fly orders', function () {

    describe('against a spread order (matching prices)', function () {

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: false, firm: true, years: [3, 5, 7], price: 0.5125, volume: 175 },
            { bank: 'WBC', bid: true, firm: true, years: [3, 5, 10], price: 0.4975, volume: 160 },
            { bank: 'NAB', bid: true, firm: true, years: [7, 10], price: 0.015, volume: 80 }
          ],
          '3x5x10',
          [
            { tnr: '3y', rec: 'WBC', pay: 'CBA', prc: '2.1250', vol: '132.0', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '5y', rec: 'CBA', pay: 'WBC', prc: '2.49875', vol: '160.0', bro_rec: '1565.62', bro_pay: '2348.43', cur: 'AUD' },
            { tnr: '7y', rec: 'NAB', pay: 'CBA', prc: '2.3600', vol: '58.0', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '10y', rec: 'WBC', pay: 'NAB', prc: '2.3750', vol: '41.5', bro_rec: null, bro_pay: '1529.64', cur: 'AUD' }
          ]
        );

      });
    });
  });

  describe('A fly derived from a fly order and spread order', function () {

    describe('against a fly order (matching prices)', function () {

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: false, firm: true, years: [3, 5, 7], price: 0.5015, volume: 150 },
            { bank: 'WBC', bid: true, firm: true, years: [7, 10], price: -0.0150, volume: 200 },
            { bank: 'NAB', bid: true, firm: true, years: [3, 5, 10], price: 0.5165, volume: 150 }
          ],
          '3x5x10',
          [
            { tnr: '3y', rec: 'NAB', pay: 'CBA', prc: '2.1250', vol: '124.0', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '5y', rec: 'CBA', pay: 'NAB', prc: '2.50825', vol: '150.0', bro_rec: '1467.77', bro_pay: '2935.54', cur: 'AUD' },
            { tnr: '7y', rec: 'WBC', pay: 'CBA', prc: '2.3900', vol: '54.5', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '10y', rec: 'NAB', pay: 'WBC', prc: '2.3750', vol: '39.0', bro_rec: null, bro_pay: '1078.12', cur: 'AUD' }
          ]
        );

      });
    });
  });

  describe('A spread derived from two spread orders', function () {

    describe('against a spread derived from a spread order and a fly order (matching prices)', function () {

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: false, firm: true, years: [3, 10], price: 0.2425, volume: 80 },
            { bank: 'WBC', bid: true, firm: true, years: [3, 5], price: 0.3675, volume: 70 },
            { bank: 'NAB', bid: true, firm: true, years: [5, 10, 15], price: -1.1150, volume: 60 },
            { bank: 'JPM', bid: true, firm: true, years: [10, 15], price: 0.9900, volume: 25 }
          ],
          '3x10x15',
          [
            { tnr: '3y', rec: 'WBC', pay: 'CBA', prc: '2.1250', vol: '95.0', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '5y', rec: 'NAB', pay: 'WBC', prc: '2.4925', vol: '57.5', bro_rec: null, bro_pay: '843.97', cur: 'AUD' },
            { tnr: '10y', rec: 'JPM', pay: 'NAB', prc: '2.3675', vol: '30.0', bro_rec: null, bro_pay: '2211.52', cur: 'AUD' },
            { tnr: '10y', rec: 'CBA', pay: 'NAB', prc: '2.3675', vol: '30.0', bro_rec: '552.88', bro_pay: null, cur: 'AUD' },
            { tnr: '15y', rec: 'NAB', pay: 'JPM', prc: '3.3575', vol: '21.0', bro_rec: null, bro_pay: '1360.23', cur: 'AUD' }
          ]
        );

      });
    });
  });

  describe('A fly derived from two spread orders', function () {

    describe('against a fly derived from a spread order and a fly order (matching prices)', function () {

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: false, firm: true, years: [3, 5], price: 0.3775, volume: 63 },
            { bank: 'WBC', bid: true, firm: true, years: [5, 10], price: -0.1325, volume: 92 },
            { bank: 'NAB', bid: true, firm: true, years: [3, 5, 15], price: -0.4975, volume: 107 },
            { bank: 'JPM', bid: true, firm: true, years: [10, 15], price: 1.0075, volume: 50 }
          ],
          '3x5x10',
          [
            { tnr: '3y', rec: 'NAB', pay: 'CBA', prc: '2.1250', vol: '88.5', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '5y', rec: 'WBC', pay: 'NAB', prc: '2.5025', vol: '53.5', bro_rec: null, bro_pay: '2094.02', cur: 'AUD' },
            { tnr: '5y', rec: 'CBA', pay: 'NAB', prc: '2.5025', vol: '53.5', bro_rec: '523.50', bro_pay: null, cur: 'AUD' },
            { tnr: '10y', rec: 'JPM', pay: 'WBC', prc: '2.3700', vol: '28.0', bro_rec: null, bro_pay: '774.03', cur: 'AUD' },
            { tnr: '15y', rec: 'NAB', pay: 'JPM', prc: '3.3775', vol: '19.5', bro_rec: null, bro_pay: '1263.07', cur: 'AUD' }
          ]
        );

      });
    });
  });

  describe('A fly derived from three fly orders', function () {

    describe('against a fly derived from three outright orders (matching prices)', function () {

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: false, firm: true, years: [5, 10, 15], price: -1.1250, volume: 55 },
            { bank: 'WBC', bid: true, firm: true, years: [1, 5, 7], price: 1.2325, volume: 105 },
            { bank: 'NAB', bid: false, firm: true, years: [1, 5, 10], price: 1.2400, volume: 115 },
            { bank: 'JPM', bid: false, firm: true, years: [5], price: 2.4750, volume: 65 },
            { bank: 'ANZ', bid: true, firm: true, years: [7], price: 2.3700, volume: 38 },
            { bank: 'BARC', bid: false, firm: true, years: [15], price: 3.3750, volume: 25 }
          ],
          '5x7x15',
          [
            { tnr: '1y', rec: 'WBC', pay: 'NAB', prc: '1.3475', vol: '260.0', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '5y', rec: 'NAB', pay: 'WBC', prc: '2.4750', vol: '105.0', bro_rec: '2054.88', bro_pay: '1541.16', cur: 'AUD' },
            { tnr: '5y', rec: 'JPM', pay: 'CBA', prc: '2.4750', vol: '26.0', bro_rec: '636.03', bro_pay: null, cur: 'AUD' },
            { tnr: '7y', rec: 'WBC', pay: 'ANZ', prc: '2.3700', vol: '38.0', bro_rec: null, bro_pay: '1527.19', cur: 'AUD' },
            { tnr: '10y', rec: 'CBA', pay: 'NAB', prc: '2.3625', vol: '27.5', bro_rec: '506.81', bro_pay: null, cur: 'AUD' },
            { tnr: '15y', rec: 'BARC', pay: 'CBA', prc: '3.3750', vol: '9.5', bro_rec: '861.48', bro_pay: null, cur: 'AUD' }
          ]
        );

      });
    });

    describe('against a fly order (matching prices)', function () {

      it('should be tradeable', function () {

        cy.verifyTrade(
          [
            { bank: 'CBA', bid: false, firm: true, years: [5, 10, 15], price: -1.1255, volume: 60 },
            { bank: 'WBC', bid: true, firm: true, years: [1, 5, 7], price: 1.2575, volume: 150 },
            { bank: 'NAB', bid: false, firm: true, years: [1, 5, 10], price: 1.2225, volume: 150 },
            { bank: 'JPM', bid: true, firm: true, years: [5, 7, 15], price: -1.1955, volume: 75 }
          ],
          '5x7x15',
          [
            { tnr: '1y', rec: 'WBC', pay: 'NAB', prc: '1.3750', vol: '371.5', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '5y', rec: 'NAB', pay: 'WBC', prc: '2.50375', vol: '150.0', bro_rec: '2935.54', bro_pay: '2201.65', cur: 'AUD' },
            { tnr: '5y', rec: 'JPM', pay: 'CBA', prc: '2.50375', vol: '37.5', bro_rec: null, bro_pay: null, cur: 'AUD' },
            { tnr: '7y', rec: 'WBC', pay: 'JPM', prc: '2.3750', vol: '54.5', bro_rec: null, bro_pay: '1825.26', cur: 'AUD' },
            { tnr: '10y', rec: 'CBA', pay: 'NAB', prc: '2.4100', vol: '39.0', bro_rec: '718.74', bro_pay: null, cur: 'AUD' },
            { tnr: '15y', rec: 'JPM', pay: 'CBA', prc: '3.44175', vol: '14.0', bro_rec: null, bro_pay: null, cur: 'AUD' }
          ]
        );

      });
    });
  });

  describe('8 leg trade, no outright prices', function() {

    it ('should be tradable with correct values', function () {

      cy.verifyTrade(
        [
          { bank: 'CBA', bid: false, firm: true, years: [2, 3], price: 0.3750, volume: 83.5 },
          { bank: 'WBC', bid: false, firm: true, years: [3, 4], price: 0.2520, volume: 63.0 },
          { bank: 'NAB', bid: true, firm: true, years: [4, 5], price: 0.1270, volume: 50.5 },
          { bank: 'JPM', bid: true, firm: true, years: [5, 6], price: -0.1200, volume: 42.5 },
          { bank: 'ANZ', bid: true, firm: true, years: [2, 4, 8], price: 0.6200, volume: 125.5 },
          { bank: 'BARC', bid: true, firm: true, years: [6, 7], price: -0.0010, volume: 36.5 },
          { bank: 'BNP', bid: true, firm: true, years: [7, 8], price: 0.0010, volume: 32.5 },
        ],
        '6 x 8',
        [
          { tnr: '2y', rec: 'ANZ', pay: 'CBA', prc: '1.7500', vol: '125.0', bro_rec: null, bro_pay: null, cur: 'AUD' },
          { tnr: '3y', rec: 'CBA', pay: 'WBC', prc: '2.1250', vol: '83.0', bro_rec: '495.38', bro_pay: null, cur: 'AUD' },
          { tnr: '4y', rec: 'WBC', pay: 'ANZ', prc: '2.3770', vol: '62.5', bro_rec: '740.41', bro_pay: '2973.48', cur: 'AUD' },
          { tnr: '4y', rec: 'NAB', pay: 'ANZ', prc: '2.3770', vol: '62.5', bro_rec: null, bro_pay: null, cur: 'AUD' },
          { tnr: '5y', rec: 'JPM', pay: 'NAB', prc: '2.5040', vol: '50.5', bro_rec: null, bro_pay: '988.30', cur: 'AUD' },
          { tnr: '6y', rec: 'BARC', pay: 'JPM', prc: '2.3840', vol: '42.5', bro_rec: null, bro_pay: '1234.46', cur: 'AUD' },
          { tnr: '7y', rec: 'BNP', pay: 'BARC', prc: '2.3830', vol: '36.5', bro_rec: null, bro_pay: '1711.39', cur: 'AUD' },
          { tnr: '8y', rec: 'ANZ', pay: 'BNP', prc: '2.3840', vol: '32.0', bro_rec: null, bro_pay: '2903.41', cur: 'AUD' }
        ]
      );

    });
  });
});
