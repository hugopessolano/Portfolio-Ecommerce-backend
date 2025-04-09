from .view_schemas import View



CUSTOMERS_PRODUCTS_ORDERS_COUNT_VIEW:View = View(name='customers_products_orders_count',
                                                query="""
                                                select s.name, count(distinct c.id) customers_count, count(distinct p.id) products_count, count(distinct o.id) orders_count
                                                from stores s
                                                left join customers c on c.store_id = s.id
                                                left join products p on p.store_id = s.id
                                                left join orders o on o.store_id = s.id
                                                group by 1;
                                                """)