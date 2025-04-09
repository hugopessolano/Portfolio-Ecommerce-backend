import os
import asyncio
from schemas.products_schemas import ProductCreate
import pandas as pd
from requests_structure import BaseRequest, execute_batch_requests
from auxiliary_functions import fetch_stores_from_csv, fetch_store_ids
import random

SCRIPT_DIR = os.path.dirname(__file__)
CSV_NAME = 'fake_products.csv'

async def build_product_create_requests(product:ProductCreate) -> BaseRequest:
    r = BaseRequest(endpoint='products', 
                    headers={'Content-Type': 'application/json'}, 
                    payload=product.model_dump())
    return r

async def main(store_ids_list:list[str]=None):
    if not store_ids_list:
        stores_list = fetch_stores_from_csv()
        store_ids_list = fetch_store_ids(stores_list)
    
    if store_ids_list is None or len(store_ids_list) == 0:
            print('No stores found')
            return []

    
    products_df = pd.read_csv(os.path.join(SCRIPT_DIR, CSV_NAME))
    products_df['store_id'] = products_df.apply(lambda _: random.choice(store_ids_list), axis=1)
    products = products_df.to_dict('records')
    products_list = [ProductCreate(**product) for product in products]
    
    request_tasks = [asyncio.create_task(build_product_create_requests(product)) for product in products_list]
    requests = await asyncio.gather(*request_tasks)
    responses = await execute_batch_requests(requests)
    return responses

if __name__ == '__main__':
    responses = asyncio.run(main())
    print(f'Processed {len(responses)} requests successfully')