import os
import asyncio
from schemas.customers_schemas import CustomerCreate
import pandas as pd
from requests_structure import BaseRequest, execute_batch_requests
import random
from auxiliary_functions import fetch_store_ids, fetch_stores_from_csv

SCRIPT_DIR = os.path.dirname(__file__)
CSV_NAME = 'fake_customers.csv'

async def build_customer_create_requests(customer:CustomerCreate) -> BaseRequest:
    r = BaseRequest(endpoint='customers', 
                    headers={'Content-Type': 'application/json'}, 
                    payload=customer.model_dump())
    return r

async def main(store_ids_list:list[str]=None):
   
    if not store_ids_list:
        stores_list = fetch_stores_from_csv()
        store_ids_list = fetch_store_ids(stores_list)
    
    if store_ids_list is None or len(store_ids_list) == 0:
            print('No stores found')
            return []

    
    customer_df = pd.read_csv(os.path.join(SCRIPT_DIR, CSV_NAME))
    customer_df['store_id'] = customer_df.apply(lambda _: random.choice(store_ids_list), axis=1)
    customers = customer_df.to_dict('records')
    customer_list = [CustomerCreate(**customer) for customer in customers]
    
    request_tasks = [asyncio.create_task(build_customer_create_requests(customer)) for customer in customer_list]
    requests = await asyncio.gather(*request_tasks)
    responses = await execute_batch_requests(requests)
    return responses

if __name__ == '__main__':
    responses = asyncio.run(main())
    print(f'Processed {len(responses)} requests successfully')