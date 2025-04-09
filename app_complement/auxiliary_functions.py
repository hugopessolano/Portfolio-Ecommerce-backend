import pandas as pd
import os
from requests_structure import BaseRequest
import requests as r
from pouplate_stores import CSV_NAME as stores_csv
from schemas.customers_schemas import BaseCustomer
from schemas.products_schemas import BaseProduct

SCRIPT_DIR = os.path.dirname(__file__)

def fetch_stores_from_csv() -> list[str]:
    stores_df = pd.read_csv(os.path.join(SCRIPT_DIR, stores_csv))
    stores_names = stores_df['name'].to_list()
    return stores_names

def fetch_store_ids(store_names_list:list[str]) -> list[str]:
    request = BaseRequest(endpoint='stores', 
                          headers={'Content-Type': 'application/json'}
                          )
    response = r.get(f'{request.url}?page=1&limit=100', headers=request.headers)
    if response.status_code == 200:
        data = response.json()
        dataframe = pd.DataFrame(data)
        filtered_stores_df = dataframe.query('name in @store_names_list')
        store_ids = filtered_stores_df['id'].to_list()
        return store_ids
    return []

def fetch_products_for_a_store(store_id:str) -> list[BaseProduct|None]:
    request = BaseRequest(endpoint=f'products/store/{store_id}', 
                          headers={'Content-Type': 'application/json'}
                          )
    
    response = r.get(f'{request.url}?page=1&limit=100', headers=request.headers)
    if response.status_code == 200:
        data = response.json()
        dataframe = pd.DataFrame(data)
        products = dataframe[BaseProduct.model_fields.keys()].to_dict('records')
        products_list = [BaseProduct(**product) for product in products]
        return products_list
    return []

def fetch_customers_for_a_store(store_id:str) ->list[BaseCustomer|None]:
    request = BaseRequest(endpoint=f'customers/store/{store_id}', 
                              headers={'Content-Type': 'application/json'}
                              )
        
    response = r.get(f'{request.url}?page=1&limit=100', headers=request.headers)
    if response.status_code == 200:
        data = response.json()
        dataframe = pd.DataFrame(data)
        customers = dataframe[BaseCustomer.model_fields.keys()].to_dict('records')
        customer_list = [BaseCustomer(**customer) for customer in customers]
        return customer_list
    return []
    