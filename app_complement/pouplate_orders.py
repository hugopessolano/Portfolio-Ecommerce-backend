import asyncio
from schemas.orders_schemas import OrderCreate, OrderProductCreate
from schemas.customers_schemas import BaseCustomer
from schemas.products_schemas import BaseProduct
from requests_structure import BaseRequest, execute_batch_requests
import random
from auxiliary_functions import fetch_store_ids, fetch_stores_from_csv, fetch_customers_for_a_store, fetch_products_for_a_store

def format_payload(order:OrderCreate) -> dict:
    order_products = [order_product.model_dump() for order_product in order.order_products]
    formatted_order = order.model_dump(exclude={'order_products'})
    payload = formatted_order | {'order_products': order_products}
    return payload

async def build_order_create_requests(order:OrderCreate) -> BaseRequest:
    r = BaseRequest(endpoint='orders', 
                    headers={'Content-Type': 'application/json'}, 
                    payload=format_payload(order))
    return r

def remove_duplicate_products(products: list[BaseProduct]) -> list[BaseProduct]:
    seen_products = set()
    unique_products = []
    
    for product in products:
        product_key = tuple(getattr(product, field) for field in product.model_fields if field != 'stock')
        if product_key not in seen_products:
            unique_products.append(product)
            seen_products.add(product_key)

    return unique_products

def build_randomized_order_products(products:list[BaseProduct]) -> list[OrderProductCreate]:
     random_products = remove_duplicate_products(list(random.choice(products) for _ in range(random.randint(1, 10))))
     products_for_order = [OrderProductCreate(product_id=product.id, quantity=random.randint(1, product.stock)) for product in random_products]
     return products_for_order

async def build_randomized_orders(store_id:str, products:list[BaseProduct], customers:list[BaseCustomer]) -> list[OrderCreate]:
    orders = list()
    for _ in range(random.randint(1, 50)):
        order_products = build_randomized_order_products(products)   
        random_customer:BaseCustomer = random.choice(customers)
        new_order = OrderCreate(store_id=store_id,
                                customer_id=random_customer.id,
                                order_products=order_products)
        orders.append(new_order)
    return orders

async def main(store_ids_list:list[str]=None):
   
    if not store_ids_list:
        stores_list = fetch_stores_from_csv()
        store_ids_list = fetch_store_ids(stores_list)
    
    if store_ids_list is None or len(store_ids_list) == 0:
            print('No stores found')
            return []

    fetched_data = {store : {
         'products': fetch_products_for_a_store(store),
         'customers': fetch_customers_for_a_store(store)
        } for store in store_ids_list}

    orders = list()
    for k,v in fetched_data.items():
        new_orders = await build_randomized_orders(k, v['products'], v['customers'])
        orders.extend(new_orders)

    
    request_tasks = [asyncio.create_task(build_order_create_requests(order)) for order in orders]
    requests = await asyncio.gather(*request_tasks)
    responses = await execute_batch_requests(requests)
    return responses

if __name__ == '__main__':
    responses = asyncio.run(main())
    print(f'Processed {len(responses)} requests successfully')