
describe('Login', function () {

  it('Logs in', function () {
    cy.visit('/');
    cy.login('mal', 'mal1');
  });

  it('Logs out', function () {
    cy.logout('mal', 'mal1');
  });

  it('Logs in again', function () {
    cy.login('mal', 'mal1');
  });

  it('Removes all 6v3 orders', function () {
    cy.xpath("//strong[text()='6v3']/../../../span[contains(@class, 'mdc-tab__ripple')]").click();
    cy.removeAllOrders();
  });

  it('Begins with no orders', function () {
    cy.get("h2").should('be.visible').and('contain', 'There are no 6v3 orders');
    cy.numOrdersIs(0);
    cy.whiteboard();
    cy.get("h1").should('be.visible').and('contain', 'There are no 6v3 prices');
    cy.numPricesIs(0);
    cy.orders();
  });
});
