# dashboard.py
import pandas as pd
import dash
from dash import dcc, html
import plotly.express as px

# Load the CSV file
df = pd.read_csv("annonces.csv")

# Clean missing values (optional)
df.fillna("Non spécifié", inplace=True)

# Initialize Dash app
app = dash.Dash(__name__)
app.title = "Tableau de Bord - Annonces Immobilier"

# Define charts
fig1 = px.pie(df, names="property_type", title="Répartition par type de bien")
fig2 = px.bar(df, x="location", title="Nombre d’annonces par localisation")
fig3 = px.histogram(df, x="price", nbins=30, title="Distribution des prix")

# Layout
app.layout = html.Div([
    html.H1("📊 Tableau de Bord des Annonces Immobilier", style={'textAlign': 'center'}),
    dcc.Graph(figure=fig1),
    dcc.Graph(figure=fig2),
    dcc.Graph(figure=fig3)
])

if __name__ == '__main__':
    app.run(debug=True)
