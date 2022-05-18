describe('Product page is rendered correctly', () => {
  it('It return 404 when the product is not existed', () => {
    cy.request('http://localhost:3000/product/123456789')
      .should(response => {
        expect(response.status).to.eq(404)
      });
  })
})
