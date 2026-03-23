using Core.Entities;
using Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Stripe;

namespace API.Controllers;

public class PaymentsController(IPaymentService paymentService) : BaseApiController
{
    [HttpPost("{cartId}")]
    public async Task<ActionResult<ShoppingCart>> CreateOrUpdatePaymentIntent(string cartId)
    {
        try
        {
            var cart = await paymentService.CreateOrUpdatePaymentIntent(cartId);

            if (cart == null)
            {
                return BadRequest(new { message = "Unable to create payment intent for this cart. Check cart items and pricing." });
            }

            return Ok(cart);
        }
        catch (StripeException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
