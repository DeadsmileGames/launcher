using System.Diagnostics;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Windowing;
using Windows.Graphics;
using Windows.Storage.Pickers;

namespace Deadsmile.Setup;

public sealed partial class MainWindow : Window
{
    private readonly string[] args;
    private readonly Microsoft.UI.Windowing.AppWindow appWindow;
    private readonly bool uninstallMode;
    private bool working;
    private bool installed;
    private string installTarget = SetupOperations.DefaultInstallPath;

    public MainWindow(string[] args)
    {
        this.args = args;
        InitializeComponent();
        ExtendsContentIntoTitleBar = true;
        SetTitleBar(SetupTitleBar);
        var hwnd = WinRT.Interop.WindowNative.GetWindowHandle(this);
        var id = Win32Interop.GetWindowIdFromWindow(hwnd);
        appWindow = Microsoft.UI.Windowing.AppWindow.GetFromWindowId(id);
        appWindow.Resize(new SizeInt32(930, 620));
        if (appWindow.Presenter is OverlappedPresenter presenter)
        {
            presenter.IsResizable = true;
            presenter.MinSize = new SizeInt32(790, 540);
        }

        installTarget = SetupOperations.GetArgument(args, "--target") ?? SetupOperations.DefaultInstallPath;
        TargetPathBox.Text = installTarget;
        uninstallMode = SetupOperations.HasArgument(args, "--uninstall");
        if (uninstallMode)
        {
            Heading.Text = "Desinstalar o launcher";
            Subtitle.Text = "Remova o aplicativo deste computador. Seus jogos, saves e configurações pessoais serão preservados.";
            TargetPathBox.IsEnabled = false;
            BrowseButton.Visibility = Visibility.Collapsed;
            LaunchAfterInstall.Visibility = Visibility.Collapsed;
            Footnote.Text = "Somente os arquivos do aplicativo serão removidos. Os dados pessoais permanecem na pasta Documentos.";
            PrimaryButton.Content = "Desinstalar";
        }
        appWindow.Closing += (_, e) =>
        {
            if (working)
            {
                e.Cancel = true;
                SetupError.Message = "Aguarde a operação atual terminar.";
                SetupError.IsOpen = true;
            }
        };
    }

    private async void BrowseFolderClick(object sender, RoutedEventArgs e)
    {
        var picker = new FolderPicker();
        picker.FileTypeFilter.Add("*");
        WinRT.Interop.InitializeWithWindow.Initialize(picker, WinRT.Interop.WindowNative.GetWindowHandle(this));
        var result = await picker.PickSingleFolderAsync();
        if (result is null) return;
        installTarget = Path.Combine(result.Path, "Deadsmile Games Launcher");
        TargetPathBox.Text = installTarget;
    }

    private async void PrimaryClick(object sender, RoutedEventArgs e)
    {
        if (working) return;
        if (uninstallMode)
        {
            var dialog = new ContentDialog
            {
                XamlRoot = Root.XamlRoot,
                Title = "Confirmar desinstalação",
                Content = "O launcher será removido. Seus jogos instalados, saves e configurações pessoais serão mantidos.",
                PrimaryButtonText = "Desinstalar",
                CloseButtonText = "Cancelar",
                DefaultButton = ContentDialogButton.Close
            };
            if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;
            try
            {
                SetupOperations.BeginUninstall(installTarget);
                Application.Current.Exit();
            }
            catch (Exception ex) { ShowError(ex.Message); }
            return;
        }

        if (installed)
        {
            if (LaunchAfterInstall.IsChecked == true)
            {
                var executable = Path.Combine(installTarget, "Deadsmile.Launcher.exe");
                Process.Start(new ProcessStartInfo(executable) { WorkingDirectory = installTarget, UseShellExecute = true });
            }
            Application.Current.Exit();
            return;
        }

        if (string.IsNullOrWhiteSpace(TargetPathBox.Text))
        {
            ShowError("Escolha uma pasta válida para continuar.");
            return;
        }
        installTarget = TargetPathBox.Text.Trim();
        SetWorking(true);
        ProgressArea.Visibility = Visibility.Visible;
        InstallProgress.Value = 0;
        ProgressLabel.Text = "Preparando os arquivos...";
        SetupError.IsOpen = false;
        try
        {
            await Task.Run(() => SetupOperations.Install(installTarget, value =>
                DispatcherQueue.TryEnqueue(() =>
                {
                    InstallProgress.Value = value;
                    ProgressLabel.Text = value < 100 ? $"Instalando... {value}%" : "Finalizando a instalação...";
                })));
            installed = true;
            Heading.Text = "Tudo pronto!";
            Subtitle.Text = "Deadsmile Games Launcher foi instalado com sucesso.";
            Footnote.Text = "Você pode abrir o launcher agora. O instalador de backup não possui assinatura comercial.";
            TargetPathBox.IsEnabled = false;
            BrowseButton.Visibility = Visibility.Collapsed;
            LaunchAfterInstall.Visibility = Visibility.Visible;
            InstallProgress.Value = 100;
            ProgressLabel.Text = "Instalação concluída.";
            PrimaryButton.Content = LaunchAfterInstall.IsChecked == true ? "Abrir launcher" : "Concluir";
            CancelButton.Content = "Fechar";
        }
        catch (Exception ex)
        {
            SetupError.Message = ex.Message;
            SetupError.IsOpen = true;
            ProgressArea.Visibility = Visibility.Collapsed;
        }
        finally { SetWorking(false); }
    }

    private void SetWorking(bool value)
    {
        working = value;
        PrimaryButton.IsEnabled = !value;
        CancelButton.IsEnabled = !value;
        BrowseButton.IsEnabled = !value;
        TargetPathBox.IsEnabled = !value && !uninstallMode && !installed;
        LaunchAfterInstall.IsEnabled = !value;
    }

    private void ShowError(string message)
    {
        SetupError.Message = message;
        SetupError.IsOpen = true;
    }

    private void CancelClick(object sender, RoutedEventArgs e) => Application.Current.Exit();
}
