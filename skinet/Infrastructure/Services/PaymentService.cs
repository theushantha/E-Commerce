using Core.Entities;
using Core.Interfaces;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Stripe;

namespace Infrastructure.Services;

public class PaymentService(
    ICartService cartService,
    StoreContext context,
    IConfiguration config
) : IPaymentService
{
    public async Task<ShoppingCart?> CreateOrUpdatePaymentIntent(string cartId)
    {
        var cart = await cartService.GetCartAsync(cartId);
        if (cart == null || cart.Items.Count == 0)
        {
            throw new InvalidOperationException("Cart not found or empty.");
        }

        var secretKey = config["StripeSettings:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException("Stripe secret key is not configured.");
        }

        StripeConfiguration.ApiKey = secretKey;

        decimal subtotal = 0m;

        foreach (var item in cart.Items)
        {
            var productPrice = await context.Products
                .Where(x => x.Id == item.ProductId)
                .Select(x => x.Price)
                .SingleOrDefaultAsync();

            if (productPrice <= 0)
            {
                throw new InvalidOperationException($"Product with ID {item.ProductId} was not found or has invalid price.");
            }

            item.Price = productPrice;
            subtotal += item.Quantity * productPrice;
        }

        var amount = Convert.ToInt64(decimal.Round(subtotal * 100, 0, MidpointRounding.AwayFromZero));
        var paymentIntentService = new PaymentIntentService();

        // Always recreate the intent as card-only to avoid reusing old intents that may include bank methods.
        if (!string.IsNullOrWhiteSpace(cart.PaymentIntentId))
        {
            try
            {
                await paymentIntentService.CancelAsync(cart.PaymentIntentId);
            }
            catch
            {
                // Ignore cancellation failures; we'll still replace the intent.
            }
        }

        var createOptions = new PaymentIntentCreateOptions
        {
            Amount = amount,
            Currency = "usd",
            PaymentMethodTypes = ["card"],
        };

        var intent = await paymentIntentService.CreateAsync(createOptions);
        cart.PaymentIntentId = intent.Id;
        cart.ClientSecret = intent.ClientSecret;

        return await cartService.SetCartAsync(cart);
    }
}
