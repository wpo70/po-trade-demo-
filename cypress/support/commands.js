// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

const menu = "//span[text()='Menu']/../div[contains(@class, 'mdc-button__ripple')]";

// Login

Cypress.Commands.add('login', function (username, password) {
  cy.xpath("id('login')").should('be.visible');
  cy.xpath("(id('login')//input)[1]").type(username);
  cy.xpath("(id('login')//input)[2]").type(password);
  cy.xpath("//div[contains(@class, 'mdc-button__ripple')]").click();
  cy.xpath("//header[contains(@class, 'mdc-top-app-bar')]").contains('PO Trade').should('be.visible');
});

// Logout

Cypress.Commands.add('logout', function () {
  cy.xpath(menu).click();
  cy.xpath("//ul/li").contains('Logout').click();
  cy.xpath("id('login')").should('be.visible');
});

// Go to whiteboard

Cypress.Commands.add('whiteboard', function () {
  cy.xpath(menu).click();
  cy.xpath("//ul/li").contains('Whiteboard').click();
  cy.xpath("//div[contains(@class, 'mdc-slider')]").should('be.visible');
});

// Go to orders

Cypress.Commands.add('orders', function () {
  cy.xpath(menu).click();
  cy.xpath("//ul/li").contains('Orders').click();
  cy.xpath("//h1[text()='Orders']").should('be.visible');
});

Cypress.Commands.add('numOrdersIs', function (n) {
  cy.get("div.mdc-drawer-app-content").find('tbody tr').should(trs => {
    expect(trs.length).equals(n);
  });
});

// When testing the number of prices there is always one table to show the
// column heading.

Cypress.Commands.add('numPricesIs', function (n) {
  cy.get("div.mdc-drawer-app-content").find('table').should(trs => {
    expect(trs.length).equals(n + 1);
  });
});

Cypress.Commands.add('addOrder', function (bid, firm, years, price, volume) {
  // Set the trader to the first.

  cy.get('#trader_input').click();
  cy.get('.autocomplete-list-item').first().click();

  // Select offer if not bid

  if (!bid) {
    cy.xpath("//form//input[@type='radio']").first().click();
  }

  // Uncheck firm if not firm.

  if (!firm) {
    cy.xpath("//form//input[@type='checkbox']").first().click();
  }

  // Tenor and price

  cy.get("form input.mdc-text-field__input").first().type(years.join(' '));
  cy.get("form input.mdc-text-field__input").eq(1).type(price.toString());

  // Negative volume means MMP

  if (volume >= 0) {
    cy.get("form input.mdc-text-field__input").eq(2).type(volume.toString());
  }

  cy.xpath("//div[contains(@class, 'orders')]//span[text()='Submit order']/../div[contains(@class, 'mdc-button__ripple')]").click();
});

Cypress.Commands.add('addOrderBank', function (bank, bid, firm, years, price, volume) {
  // Set the trader to the bank.

  cy.get('#trader_input').click().type(bank).type('{enter}');

  // Select offer if not bid

  if (!bid) {
    cy.xpath("//form//input[@type='radio']").first().click();
  }

  // Uncheck firm if not firm.

  if (!firm) {
    cy.xpath("//form//input[@type='checkbox']").first().click();
  }

  // Tenor and price

  cy.get("form input.mdc-text-field__input").first().type(years.join(' '));
  cy.get("form input.mdc-text-field__input").eq(1).type(price.toString());

  // Negative volume means MMP

  if (volume >= 0) {
    cy.get("form input.mdc-text-field__input").eq(2).type(volume.toString());
  }

  cy.xpath("//div[contains(@class, 'orders')]//span[text()='Submit order']/../div[contains(@class, 'mdc-button__ripple')]").click();

});

Cypress.Commands.add('verifyPrice', function (bid, tenor, price, bank, volume) {

  const xp = (bid) ?
    `//tbody[@class='pg']//tr//td[text()='${tenor}']/../td[text()='${price}']/../td[text()='${bank}']` :
    `//tbody[@class='pg']//tr//td[text()='${tenor}']/../td[text()='${price}']/../td[text()='${bank}']`;

  cy.xpath(xp).should('be.visible');
  cy.xpath(xp).click();

  cy.xpath("//div[contains(@class, 'mdc-menu-surface')]/ul/div[contains(@class, 'header')]/li[1]/span")
    .should('contain', tenor)
    .and('contain', (bid ? 'Bid' : 'Offer'))
    .and('contain', price)
    .and('contain', volume.toFixed(1));

  cy.xpath("//div[contains(@class, 'mdc-menu-surface')]/ul/div[contains(@class, 'header')]/li[1]/span").click();
});

Cypress.Commands.add('removeAllOrders', function () {
  cy.log('This command will fail if there are already no orders');
  cy.xpath("//strong[text()='3v1']/../../../span[contains(@class, 'mdc-tab__ripple')]").click();
  cy.xpath("//strong[text()='6v3']/../../../span[contains(@class, 'mdc-tab__ripple')]").click();
  cy.xpath("//th/div").click();
  cy.xpath("//div[contains(@class,'form')]/button/div").click();
  cy.xpath("//h2[text()='Delete orders']/../footer/button[2]/div").click();
  cy.xpath("//strong[text()='3v1']/../../../span[contains(@class, 'mdc-tab__ripple')]").click();
  cy.xpath("//strong[text()='6v3']/../../../span[contains(@class, 'mdc-tab__ripple')]").click();
});

Cypress.Commands.add('priceMatch', function (order, prices, n) {
  cy.addOrder(order.bid, order.firm, order.years, order.price, order.volume);
  cy.whiteboard();
  for (let p of prices) {
    cy.verifyPrice(p.bid, p.tenor, p.price, p.bank, p.volume);
  }
  if (typeof n !== 'undefined') {
    cy.numPricesIs(n);
  }
  cy.orders();
});

Cypress.Commands.add('closeDialog', function () {
  // Close the trade form dialog if one is visible

  cy.xpath("//div[@class='mdc-dialog__surface']").then($tform => {
    if ($tform.find("*[class^='mdc-button mdc-ripple-upgraded mdc-dialog__button']").length > 0) {
      cy.get("*[class^='mdc-button mdc-ripple-upgraded mdc-dialog__button']").then($button => {
        if ($button.is(':visible')) {
          cy.get("*[class^='mdc-button mdc-ripple-upgraded mdc-dialog__button']").click();
        }
      })
    }
  })
});

// Clicks on td at tenor

Cypress.Commands.add('trade', function (tenor) {
  // Go to whiteboard

  cy.whiteboard();

  // Click on the trade button

  cy.xpath(`//tbody[@class='pg']//tr//td[text()='${tenor}']`).click();
});

Cypress.Commands.add('numTicketsIs', function (n) {
  cy.get("div.mdc-dialog__surface").find('*[class^="ticket"]').should(tcks => {
    expect(tcks.length).equals(n);
  });
});

Cypress.Commands.add('verifyUntradeable', function (orders, tenor) {
  // Insert all orders

  if (orders !== null) {
    for (let o of orders) {
      cy.addOrderBank(o.bank, o.bid, o.firm, o.years, o.price, o.volume);
    }
  }

  // Click on trade button

  cy.trade(tenor);

  // Trade form should not be visible

  cy.get('[id^=trade-form]').should('not.exist');
});

Cypress.Commands.add('verifyTrade', function (orders, tenor, trades) {
  // Insert all orders
  for (let o of orders) {
    cy.addOrderBank(o.bank, o.bid, o.firm, o.years, o.price, o.volume);
  }

  // Click on trade button

  cy.trade(tenor, trades[0].price, 'NAB');

  // Ensure the trade form is visible

  cy.get('[id^=trade-form]').should('be.visible');

  // Ensure the number of tickets is correct

  cy.numTicketsIs(trades.length);

  // Ensure the details in the trade form are correct

  for (let i = 0; i < trades.length; i++) {
    // Get the details being displayed

    let ticket = `//div[@class="mdc-dialog__surface"]//div[contains(@class, "ticket")][${i+1}]`;

    cy.xpath(ticket).should('contain', trades[i].tnr);
    cy.xpath(ticket+`//dd[@id="rec"]`).should('contain', trades[i].rec);
    cy.xpath(ticket+`//dd[@id="pay"]`).should('contain', trades[i].pay);
    cy.xpath(ticket+`//dd[@id="price"]`).should('contain', trades[i].prc);
    cy.xpath(ticket+`//dd[@id="volume"]`).should('contain', trades[i].vol);

    // if trade has bro_rec/bro_pay, check bro value
    // otherwise, check that bro_rec/bro_pay is not visible

    if (trades[i].bro_rec !== null)
      cy.xpath(ticket+`//dd[@id="bro_rec"]`).should('contain', trades[i].bro_rec);
    else
      cy.xpath(ticket+`//dd[@id="bro_rec"]`).should('not.exist');

    if (trades[i].bro_pay !== null)
      cy.xpath(ticket+`//dd[@id="bro_pay"]`).should('contain', trades[i].bro_pay)
    else 
      cy.xpath(ticket+`//dd[@id="bro_pay"]`).should('not.exist')

    cy.xpath(ticket+`//dd[@id="curr"]`).should('contain', trades[i].cur)
  }

  // Close the trade form

  cy.xpath(`//button[text()='Cancel']`).click();

});
