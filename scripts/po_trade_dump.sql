--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.15
-- Dumped by pg_dump version 11.10 (Debian 11.10-0+deb10u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_with_oids = false;

ALTER DATABASE postgres SET timezone TO 'Australia/Sydney';

--
-- Name: banks; Type: TABLE; Schema: public; Owner: potrade
--

CREATE TABLE public.banks (
    bank_id integer NOT NULL,
    bank character varying NOT NULL
);


ALTER TABLE public.banks OWNER TO potrade;

--
-- Name: COLUMN banks.bank; Type: COMMENT; Schema: public; Owner: potrade
--

COMMENT ON COLUMN public.banks.bank IS '3 letter code';


--
-- Name: banks_bank_id_seq; Type: SEQUENCE; Schema: public; Owner: potrade
--

CREATE SEQUENCE public.banks_bank_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.banks_bank_id_seq OWNER TO potrade;

--
-- Name: banks_bank_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: potrade
--

ALTER SEQUENCE public.banks_bank_id_seq OWNED BY public.banks.bank_id;


--
-- Name: brokers; Type: TABLE; Schema: public; Owner: potrade
--

CREATE TABLE public.brokers (
    broker_id integer NOT NULL,
    firstname character varying,
    lastname character varying,
    username character varying NOT NULL,
    password character varying NOT NULL,
    accesslevel integer
);


ALTER TABLE public.brokers OWNER TO potrade;

--
-- Name: broker_list; Type: VIEW; Schema: public; Owner: potrade
--

CREATE VIEW public.broker_list AS
 SELECT brokers.lastname,
    brokers.broker_id,
    brokers.firstname,
    brokers.accesslevel
   FROM public.brokers;


ALTER TABLE public.broker_list OWNER TO potrade;

--
-- Name: brokers_broker_id_seq; Type: SEQUENCE; Schema: public; Owner: potrade
--

CREATE SEQUENCE public.brokers_broker_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.brokers_broker_id_seq OWNER TO potrade;

--
-- Name: brokers_broker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: potrade
--

ALTER SEQUENCE public.brokers_broker_id_seq OWNED BY public.brokers.broker_id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: potrade
--

CREATE TABLE public.orders (
    order_id integer NOT NULL,
    product_id integer,
    bid boolean,
    firm boolean,
    years double precision[],
    price double precision,
    volume double precision,
    trader_id integer,
    broker_id integer,
    time_placed timestamp with time zone DEFAULT now(),
    time_closed timestamp with time zone
);


ALTER TABLE public.orders OWNER TO potrade;

--
-- Name: live_orders; Type: VIEW; Schema: public; Owner: potrade
--

CREATE VIEW public.live_orders AS
 SELECT orders.order_id,
    orders.product_id,
    orders.bid,
    orders.firm,
    orders.years,
    orders.price,
    orders.volume,
    orders.trader_id,
    orders.broker_id,
    orders.time_placed,
    orders.time_closed
   FROM public.orders
  WHERE (orders.time_closed IS NULL);


ALTER TABLE public.live_orders OWNER TO potrade;

--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: potrade
--

CREATE SEQUENCE public.orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.orders_order_id_seq OWNER TO potrade;

--
-- Name: orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: potrade
--

ALTER SEQUENCE public.orders_order_id_seq OWNED BY public.orders.order_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: potrade
--

CREATE TABLE public.products (
    product_id integer NOT NULL,
    product character varying
);


ALTER TABLE public.products OWNER TO potrade;

--
-- Name: products_product_id_seq; Type: SEQUENCE; Schema: public; Owner: potrade
--

CREATE SEQUENCE public.products_product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_product_id_seq OWNER TO potrade;

--
-- Name: products_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: potrade
--

ALTER SEQUENCE public.products_product_id_seq OWNED BY public.products.product_id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: potrade
--

CREATE TABLE public.quotes (
    quote_id integer NOT NULL,
    product_id integer NOT NULL,
    year double precision NOT NULL,
    mid double precision,
    dv01 double precision,
    security character varying,
    override double precision,
    mid_is_stale boolean NOT NULL,
    dv01_is_stale boolean NOT NULL
);


ALTER TABLE public.quotes OWNER TO potrade;

--
-- Name: TABLE quotes; Type: COMMENT; Schema: public; Owner: potrade
--

COMMENT ON TABLE public.quotes IS 'All combinations of quotes and years must be entered into this table, matching those that the Bloomberg gateway is hard coded to get.';


--
-- Name: quotes_quote_id_seq; Type: SEQUENCE; Schema: public; Owner: potrade
--

CREATE SEQUENCE public.quotes_quote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.quotes_quote_id_seq OWNER TO potrade;

--
-- Name: quotes_quote_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: potrade
--

ALTER SEQUENCE public.quotes_quote_id_seq OWNED BY public.quotes.quote_id;


--
-- Name: tickers; Type: TABLE; Schema: public; Owner: potrade
--

CREATE TABLE public.tickers (
    ticker_id integer NOT NULL,
    property character varying NOT NULL,
    security character varying NOT NULL
);


ALTER TABLE public.tickers OWNER TO potrade;

--
-- Name: tickers_ticker_id_seq; Type: SEQUENCE; Schema: public; Owner: potrade
--

CREATE SEQUENCE public.tickers_ticker_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tickers_ticker_id_seq OWNER TO potrade;

--
-- Name: tickers_ticker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: potrade
--

ALTER SEQUENCE public.tickers_ticker_id_seq OWNED BY public.tickers.ticker_id;


--
-- Name: traders; Type: TABLE; Schema: public; Owner: potrade
--

CREATE TABLE public.traders (
    trader_id integer NOT NULL,
    firstname character varying,
    lastname character varying,
    preferredname character varying,
    bank_id integer
);


ALTER TABLE public.traders OWNER TO potrade;

--
-- Name: traders_trader_id_seq; Type: SEQUENCE; Schema: public; Owner: potrade
--

CREATE SEQUENCE public.traders_trader_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.traders_trader_id_seq OWNER TO potrade;

--
-- Name: traders_trader_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: potrade
--

ALTER SEQUENCE public.traders_trader_id_seq OWNED BY public.traders.trader_id;


--
-- Name: banks bank_id; Type: DEFAULT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.banks ALTER COLUMN bank_id SET DEFAULT nextval('public.banks_bank_id_seq'::regclass);


--
-- Name: brokers broker_id; Type: DEFAULT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.brokers ALTER COLUMN broker_id SET DEFAULT nextval('public.brokers_broker_id_seq'::regclass);


--
-- Name: orders order_id; Type: DEFAULT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.orders ALTER COLUMN order_id SET DEFAULT nextval('public.orders_order_id_seq'::regclass);


--
-- Name: products product_id; Type: DEFAULT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.products ALTER COLUMN product_id SET DEFAULT nextval('public.products_product_id_seq'::regclass);


--
-- Name: quotes quote_id; Type: DEFAULT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.quotes ALTER COLUMN quote_id SET DEFAULT nextval('public.quotes_quote_id_seq'::regclass);


--
-- Name: tickers ticker_id; Type: DEFAULT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.tickers ALTER COLUMN ticker_id SET DEFAULT nextval('public.tickers_ticker_id_seq'::regclass);


--
-- Name: traders trader_id; Type: DEFAULT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.traders ALTER COLUMN trader_id SET DEFAULT nextval('public.traders_trader_id_seq'::regclass);


--
-- Data for Name: banks; Type: TABLE DATA; Schema: public; Owner: potrade
--

INSERT INTO public.banks VALUES (1, 'CBA');
INSERT INTO public.banks VALUES (2, 'WBC');
INSERT INTO public.banks VALUES (3, 'NAB');
INSERT INTO public.banks VALUES (4, 'JPM');
INSERT INTO public.banks VALUES (5, 'ANZ');
INSERT INTO public.banks VALUES (6, 'BARC');
INSERT INTO public.banks VALUES (7, 'CIT');
INSERT INTO public.banks VALUES (8, 'JEF');
INSERT INTO public.banks VALUES (9, 'NOM');
INSERT INTO public.banks VALUES (10, 'BAML');
INSERT INTO public.banks VALUES (11, 'BNP');
INSERT INTO public.banks VALUES (12, 'HSBC');
INSERT INTO public.banks VALUES (13, 'GS');
INSERT INTO public.banks VALUES (14, 'UBS');
INSERT INTO public.banks VALUES (15, 'ING');


--
-- Data for Name: brokers; Type: TABLE DATA; Schema: public; Owner: potrade
--

INSERT INTO public.brokers VALUES (1, 'Will', 'Parry-Okeden', 'will', 'will1');
INSERT INTO public.brokers VALUES (2, 'Richard', 'Powell', 'richard', 'richard1');
INSERT INTO public.brokers VALUES (3, 'Matt', 'Patrick', 'matt', 'matt1');
INSERT INTO public.brokers VALUES (4, 'Mal', 'Goris', 'mal', 'mal1');
INSERT INTO public.brokers VALUES (5, 'Adam', 'Goris', 'adam', 'adam1');


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: potrade
--

INSERT INTO public.orders VALUES (1, 1, true, true, '{2,3}', 1, 140, 3, 2, '2021-04-15 16:19:51.302325+10', NULL);
INSERT INTO public.orders VALUES (2, 1, false, true, '{2,3,4}', 0.100000000000000006, 105, 6, 1, '2021-04-15 16:19:51.302325+10', NULL);
INSERT INTO public.orders VALUES (3, 1, true, true, '{5,7,10}', -1.10000000000000009, 35, 8, 4, '2021-04-15 16:19:51.302325+10', NULL);
INSERT INTO public.orders VALUES (4, 1, true, true, '{5}', 4.95000000000000018, 92, 1, 3, '2021-04-15 16:19:51.302325+10', NULL);
INSERT INTO public.orders VALUES (5, 1, true, true, '{10}', 9.94999999999999929, 35, 7, 2, '2021-04-15 16:19:51.302325+10', NULL);
INSERT INTO public.orders VALUES (6, 1, false, false, '{7}', 7, 72, 4, 1, '2021-04-15 16:19:51.302325+10', NULL);


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: potrade
--

INSERT INTO public.products VALUES (1, 'IRS');
INSERT INTO public.products VALUES (2, 'EFP');
INSERT INTO public.products VALUES (3, '6v3');
INSERT INTO public.products VALUES (4, '3v1');
INSERT INTO public.products VALUES (5, 'AUD/USD');
INSERT INTO public.products VALUES (6, 'OIS');
INSERT INTO public.products VALUES (7, 'BOB');


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: potrade
--

INSERT INTO public.quotes VALUES (1, 1, 0.25, 0.25, 0.25, 'ADSOC Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (2, 1, 0.5, 0.5, 0.5, 'ADSWQF Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (3, 1, 0.75, 0.75, 0.75, 'ADSWQI Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (4, 1, 1, 1, 1, 'ADSWAP1Q Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (5, 1, 1.5, 1.5, 1.5, '', NULL, false, false);
INSERT INTO public.quotes VALUES (6, 1, 2, 2, 2, 'ADSWAP2Q Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (7, 1, 3, 3, 3, 'ADSWAP3Q Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (8, 1, 4, 4, 4, 'ADSWAP4 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (9, 1, 5, 5, 5, 'ADSWAP5 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (10, 1, 6, 6, 6, 'ADSWAP6 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (11, 1, 7, 7, 7, 'ADSWAP7 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (12, 1, 8, 8, 8, 'ADSWAP8 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (13, 1, 9, 9, 9, 'ADSWAP9 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (14, 1, 10, 10, 10, 'ADSWAP10 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (15, 1, 11, 11, 11, 'ADSWAP11 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (16, 1, 12, 12, 12, 'ADSWAP12 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (17, 1, 13, 13, 13, 'ADSWAP13 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (18, 1, 14, 14, 14, 'ADSWAP14 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (19, 1, 15, 15, 15, 'ADSWAP15 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (20, 1, 20, 20, 20, 'ADSWAP20 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (21, 1, 25, 25, 25, 'ADSWAP25 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (22, 1, 30, 30, 30, 'ADSWAP30 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (23, 2, 2, 2, 2, 'ADSF2 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (24, 2, 3, 3, 3, 'ADSF3 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (25, 2, 4, 4, 4, 'ADSF4 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (26, 2, 5, 5, 5, 'ADSF5 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (27, 2, 6, 6, 6, 'ADSF6 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (28, 2, 7, 7, 7, 'ADSF7 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (29, 2, 8, 8, 8, 'ADSF8 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (30, 2, 9, 9, 9, 'ADSF9 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (31, 2, 10, 10, 10, 'ADSF10 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (32, 2, 11, 11, 11, '', NULL, false, false);
INSERT INTO public.quotes VALUES (33, 2, 12, 12, 12, 'ADSF12 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (34, 2, 13, 13, 13, '', NULL, false, false);
INSERT INTO public.quotes VALUES (35, 2, 14, 14, 14, '', NULL, false, false);
INSERT INTO public.quotes VALUES (36, 2, 15, 15, 15, 'ADSF15 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (37, 2, 20, 20, 20, 'ADSF20 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (38, 2, 25, 25, 25, 'ADSF25 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (39, 2, 30, 30, 30, 'ADSF30 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (40, 3, 0.5, 0.5, 0.5, 'ADBBCFF Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (41, 3, 1, 1, 1, 'ADBBCF1 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (42, 3, 2, 2, 2, 'ADBBCF2 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (43, 3, 3, 3, 3, 'ADBBCF3 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (44, 3, 4, 4, 4, 'ADBBCF4 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (45, 3, 5, 5, 5, 'ADBBCF5 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (46, 3, 6, 6, 6, 'ADBBCF6 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (47, 3, 7, 7, 7, 'ADBBCF7 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (48, 3, 8, 8, 8, 'ADBBCF8 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (49, 3, 9, 9, 9, 'ADBBCF9 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (50, 3, 10, 10, 10, 'ADBBCF10 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (51, 3, 11, 11, 11, '', NULL, false, false);
INSERT INTO public.quotes VALUES (52, 3, 12, 12, 12, 'ADBBCF12 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (53, 3, 13, 13, 13, '', NULL, false, false);
INSERT INTO public.quotes VALUES (54, 3, 14, 14, 14, '', NULL, false, false);
INSERT INTO public.quotes VALUES (55, 3, 15, 15, 15, 'ADBBCF15 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (56, 3, 20, 20, 20, 'ADBBCF20 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (57, 3, 25, 25, 25, 'ADBBCF25 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (58, 3, 30, 30, 30, 'ADBBCF30 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (59, 4, 0.25, 0.25, 0.25, 'ADBBCAC Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (60, 4, 0.5, 0.5, 0.5, 'ADBBCAF Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (61, 4, 0.75, 0.75, 0.75, 'ADBBCAI Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (62, 4, 1, 1, 1, 'ADBBCA1 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (63, 4, 2, 2, 2, 'ADBBCA2 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (64, 4, 3, 3, 3, 'ADBBCA3 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (65, 4, 4, 4, 4, 'ADBBCA4 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (66, 4, 5, 5, 5, 'ADBBCA5 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (67, 4, 7, 7, 7, 'ADBBCA7 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (68, 4, 10, 10, 10, 'ADBBCA10 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (69, 4, 11, 11, 11, '', NULL, false, false);
INSERT INTO public.quotes VALUES (70, 4, 12, 12, 12, 'ADBBCA12 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (71, 4, 13, 13, 13, '', NULL, false, false);
INSERT INTO public.quotes VALUES (72, 4, 14, 14, 14, '', NULL, false, false);
INSERT INTO public.quotes VALUES (73, 4, 15, 15, 15, 'ADBBCA15 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (74, 4, 20, 20, 20, 'ADBBCA20 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (75, 4, 25, 25, 25, 'ADBBCA25 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (76, 4, 30, 30, 30, 'ADBBCA30 Curncy ', NULL, false, false);
INSERT INTO public.quotes VALUES (77, 5, 0.25, 0.25, 0.25, 'ADBSC Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (78, 5, 0.5, 0.5, 0.5, 'ADBSF Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (79, 5, 0.75, 0.75, 0.75, 'ADBSI Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (80, 5, 1, 1, 1, 'ADBS1 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (81, 5, 1.5, 1.5, 1.5, '', NULL, false, false);
INSERT INTO public.quotes VALUES (82, 5, 2, 2, 2, 'ADBS2 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (83, 5, 3, 3, 3, 'ADBS3 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (84, 5, 4, 4, 4, 'ADBS4 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (85, 5, 5, 5, 5, 'ADBS5 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (86, 5, 6, 6, 6, 'ADBS6 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (87, 5, 7, 7, 7, 'ADBS7 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (88, 5, 8, 8, 8, 'ADBS8 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (89, 5, 9, 9, 9, 'ADBS9 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (90, 5, 10, 10, 10, 'ADBS10 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (91, 5, 11, 11, 11, '', NULL, false, false);
INSERT INTO public.quotes VALUES (92, 5, 12, 12, 12, 'ADBS12 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (93, 5, 13, 13, 13, '', NULL, false, false);
INSERT INTO public.quotes VALUES (94, 5, 14, 14, 14, '', NULL, false, false);
INSERT INTO public.quotes VALUES (95, 5, 15, 15, 15, 'ADBS15 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (96, 5, 20, 20, 20, 'ADBS20 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (97, 5, 25, 25, 25, 'ADBS25 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (98, 5, 30, 30, 30, 'ADBS30 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (99, 6, 0.25, 0.25, 0.25, '', NULL, false, false);
INSERT INTO public.quotes VALUES (100, 6, 0.5, 0.5, 0.5, '', NULL, false, false);
INSERT INTO public.quotes VALUES (101, 6, 0.75, 0.75, 0.75, '', NULL, false, false);
INSERT INTO public.quotes VALUES (102, 6, 1, 1, 1, '', NULL, false, false);
INSERT INTO public.quotes VALUES (103, 6, 1.5, 1.5, 1.5, '', NULL, false, false);
INSERT INTO public.quotes VALUES (104, 6, 2, 2, 2, '', NULL, false, false);
INSERT INTO public.quotes VALUES (105, 6, 3, 3, 3, '', NULL, false, false);
INSERT INTO public.quotes VALUES (106, 6, 4, 4, 4, '', NULL, false, false);
INSERT INTO public.quotes VALUES (107, 6, 5, 5, 5, '', NULL, false, false);
INSERT INTO public.quotes VALUES (108, 6, 6, 6, 6, '', NULL, false, false);
INSERT INTO public.quotes VALUES (109, 6, 7, 7, 7, '', NULL, false, false);
INSERT INTO public.quotes VALUES (110, 6, 8, 8, 8, '', NULL, false, false);
INSERT INTO public.quotes VALUES (111, 6, 9, 9, 9, '', NULL, false, false);
INSERT INTO public.quotes VALUES (112, 6, 10, 10, 10, '', NULL, false, false);
INSERT INTO public.quotes VALUES (113, 6, 11, 11, 11, '', NULL, false, false);
INSERT INTO public.quotes VALUES (114, 6, 12, 12, 12, '', NULL, false, false);
INSERT INTO public.quotes VALUES (115, 6, 13, 13, 13, '', NULL, false, false);
INSERT INTO public.quotes VALUES (116, 6, 14, 14, 14, '', NULL, false, false);
INSERT INTO public.quotes VALUES (117, 6, 15, 15, 15, '', NULL, false, false);
INSERT INTO public.quotes VALUES (118, 6, 20, 20, 20, '', NULL, false, false);
INSERT INTO public.quotes VALUES (119, 6, 25, 25, 25, '', NULL, false, false);
INSERT INTO public.quotes VALUES (120, 6, 30, 30, 30, '', NULL, false, false);
INSERT INTO public.quotes VALUES (121, 7, 0.25, 0.25, 0.25, '', NULL, false, false);
INSERT INTO public.quotes VALUES (122, 7, 0.5, 0.5, 0.5, '', NULL, false, false);
INSERT INTO public.quotes VALUES (123, 7, 0.75, 0.75, 0.75, '', NULL, false, false);
INSERT INTO public.quotes VALUES (124, 7, 1, 1, 1, 'ADBBCO1 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (125, 7, 1.5, 1.5, 1.5, '', NULL, false, false);
INSERT INTO public.quotes VALUES (126, 7, 2, 2, 2, 'ADBBCO2 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (127, 7, 3, 3, 3, 'ADBBCO3 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (128, 7, 4, 4, 4, 'ADBBCO4 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (129, 7, 5, 5, 5, 'ADBBCO5 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (130, 7, 6, 6, 6, 'ADBBCO6 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (131, 7, 7, 7, 7, 'ADBBCO7 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (132, 7, 8, 8, 8, 'ADBBCO8 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (133, 7, 9, 9, 9, 'ADBBCO9 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (134, 7, 10, 10, 10, 'ADBBCO10 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (135, 7, 11, 11, 11, '', NULL, false, false);
INSERT INTO public.quotes VALUES (136, 7, 12, 12, 12, 'ADBBCO12 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (137, 7, 13, 13, 13, '', NULL, false, false);
INSERT INTO public.quotes VALUES (138, 7, 14, 14, 14, '', NULL, false, false);
INSERT INTO public.quotes VALUES (139, 7, 15, 15, 15, 'ADBBCO15 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (140, 7, 20, 20, 20, 'ADBBCO20 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (141, 7, 25, 25, 25, 'ADBBCO25 Curncy', NULL, false, false);
INSERT INTO public.quotes VALUES (142, 7, 30, 30, 30, 'ADBBCO30 Curncy', NULL, false, false);


--
-- Data for Name: tickers; Type: TABLE DATA; Schema: public; Owner: potrade
--

INSERT INTO public.tickers VALUES (1, 'xma', 'XMA Comdty');
INSERT INTO public.tickers VALUES (2, 'yma', 'YMA Comdty');


--
-- Data for Name: traders; Type: TABLE DATA; Schema: public; Owner: potrade
--

INSERT INTO public.traders VALUES (1, 'Brendan ', 'Coughlan', 'B Coughlan', 1);
INSERT INTO public.traders VALUES (2, 'Rob ', 'Collins', 'Rob', 3);
INSERT INTO public.traders VALUES (3, 'Hermeet', '', 'Herms', 3);
INSERT INTO public.traders VALUES (4, 'Ef ', 'Kazepidis', 'Ef', 3);
INSERT INTO public.traders VALUES (5, 'Michael', 'Coad', 'Coads', 3);
INSERT INTO public.traders VALUES (6, 'Nick', 'Allen', 'Nick', 2);
INSERT INTO public.traders VALUES (7, 'Ben', 'Fischer', 'Fish', 5);
INSERT INTO public.traders VALUES (8, 'Yakun ', 'Popli', 'Yakun', 5);
INSERT INTO public.traders VALUES (9, 'Paul ', 'Woodward', 'Woody', 5);
INSERT INTO public.traders VALUES (10, 'John ', 'Austin', 'John', 5);
INSERT INTO public.traders VALUES (11, 'Matt', 'Wilaon', 'Matt', 6);
INSERT INTO public.traders VALUES (12, 'Andrew ', 'Walsh', 'Walshy', 7);
INSERT INTO public.traders VALUES (13, 'Aaron ', '', '', 7);
INSERT INTO public.traders VALUES (14, 'Tom ', 'Dwyer', 'Tom ', 4);
INSERT INTO public.traders VALUES (15, 'Chris', 'Corbett', 'Corbs', 4);
INSERT INTO public.traders VALUES (16, 'Richard', 'Tocker', 'Tock', 4);
INSERT INTO public.traders VALUES (17, 'Brad', 'Castelano', 'Brad', 4);
INSERT INTO public.traders VALUES (18, 'Rowan ', 'Addison', 'Rowan', 4);
INSERT INTO public.traders VALUES (19, 'Liang ', 'Hong ', 'Liang', 4);
INSERT INTO public.traders VALUES (20, 'Martin ', 'Lacey', 'Marty', 4);
INSERT INTO public.traders VALUES (21, 'Calvin', '', 'Calvin', 4);
INSERT INTO public.traders VALUES (22, 'Paul ', 'Docherty', 'Paul ', 8);
INSERT INTO public.traders VALUES (23, 'Keiran ', 'Ramsey', 'Keiran', 9);
INSERT INTO public.traders VALUES (24, 'Barrie ', 'Feldman', 'Barrie', 9);
INSERT INTO public.traders VALUES (25, 'Ted ', 'Lingyu-Zhang', 'Ted', 10);
INSERT INTO public.traders VALUES (26, 'Mark ', 'Elworthy', 'Mark ', 10);
INSERT INTO public.traders VALUES (27, 'Damon ', 'Raddich', 'Damo', 11);
INSERT INTO public.traders VALUES (28, 'Fabien', 'Chazot', 'Fab', 11);
INSERT INTO public.traders VALUES (29, 'Jeff', 'Tjeuw', 'Jeff ', 12);
INSERT INTO public.traders VALUES (30, 'Omar ', 'Tazi', 'Omar', 12);
INSERT INTO public.traders VALUES (31, 'Christian ', 'Gertsch', 'Gert', 13);
INSERT INTO public.traders VALUES (32, 'Sarah', 'McCann', 'Sarah', 13);
INSERT INTO public.traders VALUES (33, 'Nadim', 'Dabam', 'Nadim ', 13);
INSERT INTO public.traders VALUES (34, 'Lisa ', 'Zhou', 'Lisa', 14);
INSERT INTO public.traders VALUES (35, 'Paul', 'Guenancia', 'Paul ', 14);
INSERT INTO public.traders VALUES (36, 'Ming ', 'Li', 'Ming ', 14);
INSERT INTO public.traders VALUES (37, 'Pamela', 'Goh ', 'Pam', 15);
INSERT INTO public.traders VALUES (38, 'Masatsugu', 'Takahashi', 'Matt', 15);


--
-- Name: banks_bank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: potrade
--

SELECT pg_catalog.setval('public.banks_bank_id_seq', 15, true);


--
-- Name: brokers_broker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: potrade
--

SELECT pg_catalog.setval('public.brokers_broker_id_seq', 5, true);


--
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: potrade
--

SELECT pg_catalog.setval('public.orders_order_id_seq', 6, false);


--
-- Name: products_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: potrade
--

SELECT pg_catalog.setval('public.products_product_id_seq', 7, true);


--
-- Name: quotes_quote_id_seq; Type: SEQUENCE SET; Schema: public; Owner: potrade
--

SELECT pg_catalog.setval('public.quotes_quote_id_seq', 142, true);


--
-- Name: tickers_ticker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: potrade
--

SELECT pg_catalog.setval('public.tickers_ticker_id_seq', 2, true);


--
-- Name: traders_trader_id_seq; Type: SEQUENCE SET; Schema: public; Owner: potrade
--

SELECT pg_catalog.setval('public.traders_trader_id_seq', 38, true);


--
-- Name: banks banks_name_key; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_name_key UNIQUE (bank);


--
-- Name: banks banks_pkey; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT banks_pkey PRIMARY KEY (bank_id);


--
-- Name: brokers brokers_pkey; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.brokers
    ADD CONSTRAINT brokers_pkey PRIMARY KEY (broker_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (product_id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (quote_id);


--
-- Name: quotes quotes_product_id_year_key; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_product_id_year_key UNIQUE (product_id, year);


--
-- Name: tickers ticker_property_key; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.tickers
    ADD CONSTRAINT ticker_property_key UNIQUE (property);


--
-- Name: tickers ticker_security_key; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.tickers
    ADD CONSTRAINT ticker_security_key UNIQUE (security);


--
-- Name: tickers tickers_pkey; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.tickers
    ADD CONSTRAINT tickers_pkey PRIMARY KEY (ticker_id);


--
-- Name: traders traders_pkey; Type: CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.traders
    ADD CONSTRAINT traders_pkey PRIMARY KEY (trader_id);


--
-- Name: orders orders_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.brokers(broker_id) ON DELETE RESTRICT;


--
-- Name: orders orders_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: orders orders_trader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_trader_id_fkey FOREIGN KEY (trader_id) REFERENCES public.traders(trader_id) ON DELETE RESTRICT;


--
-- Name: quotes quotes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT;


--
-- Name: traders traders_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: potrade
--

ALTER TABLE ONLY public.traders
    ADD CONSTRAINT traders_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.banks(bank_id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

